"""Supervisor fail-fast: si falla un proceso crítico, detiene el contenedor.

tini recoge procesos huérfanos; PostgreSQL y Node se ejecutan sin privilegios.
"""
import os
import json
import fcntl
import pathlib
import pwd
import signal
import subprocess
import sys
import time
from urllib.parse import quote
from urllib.parse import urlsplit

ROOT = pathlib.Path('/var/lib/workflow')
DATA = ROOT / 'postgres'
BIN = '/usr/lib/postgresql/16/bin/'
children = []
stopping = False
volume_lock = None


def stop_requested(signum, frame):
    global stopping
    stopping = True


signal.signal(signal.SIGTERM, stop_requested)
signal.signal(signal.SIGINT, stop_requested)


def start(command, user, **kwargs):
    account = pwd.getpwnam(user)
    process = subprocess.Popen(command, user=account.pw_uid, group=account.pw_gid,
                               extra_groups=[], start_new_session=True, **kwargs)
    children.append(process)
    return process


def wait(process, timeout=120):
    deadline = time.monotonic() + timeout
    while process.poll() is None:
        if stopping:
            raise InterruptedError('Apagado solicitado')
        if time.monotonic() > deadline:
            raise TimeoutError('Tiempo de inicialización excedido')
        time.sleep(0.1)
    if process.returncode:
        raise RuntimeError(f'Proceso de inicialización terminó con código {process.returncode}')


def psql(statement):
    process = start([BIN + 'psql', '-h', '/run/postgresql', '-U', 'postgres', '-d', 'postgres',
                     '-v', 'ON_ERROR_STOP=1', '-X'], 'postgres', stdin=subprocess.PIPE)
    process.stdin.write(statement.encode())
    process.stdin.close()
    wait(process)


def main():
    global volume_lock
    origin = urlsplit(os.environ.get('ORIGIN', ''))
    if os.environ.get('ORIGIN') and (origin.scheme not in ('http', 'https') or not origin.netloc or origin.path not in ('', '/')):
        raise ValueError('ORIGIN debe ser la URL pública completa, por ejemplo http://192.168.1.20:3000')
    if origin.query or origin.fragment or origin.username or origin.password:
        raise ValueError('ORIGIN no admite credenciales, parámetros ni fragmentos')
    if origin.scheme == 'http' and os.environ.get('WORKFLOW_LOCAL_HTTP') != 'true':
        raise ValueError('Para HTTP local define WORKFLOW_LOCAL_HTTP=true; para HTTPS usa false')
    postgres = pwd.getpwnam('postgres')
    node = pwd.getpwnam('node')
    ROOT.mkdir(mode=0o755, exist_ok=True)
    volume_lock = open(ROOT / '.workflow.lock', 'a')
    try:
        fcntl.flock(volume_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise RuntimeError('El volumen ya está en uso por otra instancia de Workflow')
    version_file = DATA / 'PG_VERSION'
    password_file = ROOT / 'db-password'
    if version_file.exists():
        if version_file.read_text().strip() != '16':
            raise RuntimeError('El volumen no es PostgreSQL 16; requiere una migración explícita')
        if not password_file.is_file() or not password_file.read_text().strip():
            raise RuntimeError('Falta db-password de una base existente; restaura la configuración, no se regenerará')
    elif DATA.exists() and any(DATA.iterdir()):
        raise RuntimeError('El directorio postgres contiene datos sin PG_VERSION; no se reinicializará')
    uploads = ROOT / 'uploads'
    uploads.mkdir(mode=0o700, exist_ok=True)
    os.chown(uploads, node.pw_uid, node.pw_gid)
    DATA.mkdir(mode=0o700, exist_ok=True)
    os.chown(DATA, postgres.pw_uid, postgres.pw_gid)
    if not (DATA / 'PG_VERSION').exists():
        wait(start([BIN + 'initdb', '-D', str(DATA), '--auth-local=peer',
                    '--auth-host=scram-sha-256', '--encoding=UTF8', '--locale=C.UTF-8'], 'postgres'))
    if not password_file.exists():
        password = os.environ.get('POSTGRES_PASSWORD') or 'Pass123456'
        if len(password) < 10:
            raise ValueError('POSTGRES_PASSWORD debe tener al menos 10 caracteres')
        with open(password_file, 'x', opener=lambda path, flags: os.open(path, flags, 0o600)) as file:
            file.write(password)
    password = password_file.read_text()
    pg = start([BIN + 'postgres', '-D', str(DATA), '-c', 'listen_addresses=127.0.0.1',
                '-c', 'unix_socket_directories=/run/postgresql'], 'postgres')
    deadline = time.monotonic() + 60
    while True:
        if stopping:
            raise InterruptedError('Apagado solicitado')
        if pg.poll() is not None or time.monotonic() > deadline:
            raise RuntimeError('PostgreSQL no pudo iniciar')
        probe = start([BIN + 'pg_isready', '-q', '-h', '/run/postgresql', '-U', 'postgres'], 'postgres')
        # pg_isready devuelve 1 mientras PostgreSQL termina de iniciar.
        probe.wait(timeout=5)
        if probe.returncode == 0:
            break
        time.sleep(0.25)
    literal = "'" + password.replace("'", "''") + "'"
    psql("SELECT 'CREATE ROLE \"admin@utslp.com\" LOGIN PASSWORD ' || quote_literal(" + literal + ") "
         "WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin@utslp.com') \\gexec\n"
         "SELECT 'CREATE DATABASE workflow OWNER \"admin@utslp.com\"' "
         "WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'workflow') \\gexec\n")
    environment = dict(os.environ)
    environment['DATABASE_URL'] = 'postgresql://admin%40utslp.com:' + quote(password, safe='') + '@127.0.0.1:5432/workflow'
    credentials_file = ROOT / 'initial-admin.json'
    if not credentials_file.exists():
        credentials = {'email': os.environ.get('ADMIN_EMAIL') or 'admin@utslp.com',
                       'password': os.environ.get('ADMIN_PASSWORD') or 'Pass123456'}
        with open(credentials_file, 'x', opener=lambda path, flags: os.open(path, flags, 0o600)) as file:
            json.dump(credentials, file)
    credentials = json.loads(credentials_file.read_text())
    environment['ADMIN_EMAIL'] = credentials['email']
    environment['ADMIN_PASSWORD'] = credentials['password']
    environment['PROTOCOL_HEADER'] = 'x-workflow-protocol'
    # El usuario node no necesita conocer variables del bootstrap tras inicializar.
    wait(start(['node', '/app/docker/universidad/initialize.mjs'], 'node', env=environment))
    for key in ('ADMIN_PASSWORD', 'POSTGRES_PASSWORD'):
        environment.pop(key, None)
    app = start(['node', '/app/docker/universidad/server.mjs'], 'node', env=environment)
    print('Workflow universidad: aplicación y PostgreSQL iniciados.', flush=True)
    while not stopping:
        if pg.poll() is not None or app.poll() is not None:
            raise RuntimeError('Un proceso crítico terminó; apagando el contenedor')
        time.sleep(0.25)


exit_code = 0
try:
    main()
except InterruptedError:
    pass
except Exception as error:
    print(f'ERROR: {error}', file=sys.stderr, flush=True)
    exit_code = 1
finally:
    # Orden inverso: Node termina sus solicitudes antes de detener PostgreSQL.
    for process in reversed(children):
        if process.poll() is not None:
            continue
        try:
            is_postgres = process.args[0] == BIN + 'postgres'
            os.killpg(process.pid, signal.SIGINT if is_postgres else signal.SIGTERM)
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
        except ProcessLookupError:
            pass
sys.exit(exit_code)
