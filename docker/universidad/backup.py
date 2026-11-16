"""Respaldo físico en frío; ejecutar con la aplicación detenida y la misma imagen."""
import argparse
import fcntl
import gzip
import hashlib
import io
import json
import os
import pathlib
import platform
import pwd
import stat
import subprocess
import tarfile
from datetime import datetime, timezone

ROOT = pathlib.Path('/var/lib/workflow')
MANIFEST = 'workflow-backup-manifest.json'


def digest(stream):
    value = hashlib.sha256()
    while chunk := stream.read(1024 * 1024):
        value.update(chunk)
    return value.hexdigest()


def check_database(allow_restore=False):
    if not allow_restore and (ROOT / '.restore-in-progress').exists():
        raise ValueError('Restauración incompleta: utiliza un volumen nuevo')
    if (ROOT / 'postgres/PG_VERSION').read_text().strip() != '16':
        raise ValueError('Solo se admite PostgreSQL 16')
    result = subprocess.run(
        ['/usr/lib/postgresql/16/bin/pg_controldata', str(ROOT / 'postgres')],
        check=True, capture_output=True, text=True, env={**os.environ, 'LC_ALL': 'C'})
    state = next(line.split(':', 1)[1].strip() for line in result.stdout.splitlines()
                 if line.startswith('Database cluster state:'))
    if state != 'shut down':
        raise ValueError('PostgreSQL no tuvo un apagado limpio; inicia y detén la app antes de respaldar')
    for name in ('db-password', 'initial-admin.json'):
        if not (ROOT / name).is_file():
            raise ValueError(f'Falta configuración persistente: {name}')
    if not (ROOT / 'uploads').is_dir():
        raise ValueError('Falta el directorio de adjuntos')


def backup(path):
    check_database()
    if path.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError('Guarda el respaldo fuera del volumen de datos')
    entries = {}
    for item in sorted(ROOT.rglob('*')):
        name = item.relative_to(ROOT).as_posix()
        if name == '.workflow.lock':
            continue
        mode = item.lstat().st_mode
        if not (stat.S_ISREG(mode) or stat.S_ISDIR(mode)) or name == MANIFEST:
            raise ValueError(f'Archivo especial o enlace no admitido: {name}')
        entry = {'kind': 'directory' if item.is_dir() else 'file'}
        if item.is_file():
            with item.open('rb') as stream:
                entry['sha256'] = digest(stream)
            entry['size'] = item.stat().st_size
        entries[name] = entry
    manifest = {'format': 1, 'postgres_major': '16', 'architecture': platform.machine(),
                'created_utc': datetime.now(timezone.utc).isoformat(), 'entries': entries}
    # O_EXCL evita sobrescrituras; un archivo interrumpido no pasará la validación.
    with open(path, 'xb', opener=lambda p, flags: os.open(p, flags, 0o600)) as output:
        with tarfile.open(fileobj=output, mode='w:gz') as archive:
            for name in entries:
                archive.add(ROOT / name, arcname=name, recursive=False)
            data = json.dumps(manifest).encode()
            info = tarfile.TarInfo(MANIFEST)
            info.size, info.mode = len(data), 0o600
            archive.addfile(info, io.BytesIO(data))
        output.flush()
        os.fsync(output.fileno())
    print(f'Respaldo creado: {path.name}. Conserva también la imagen Docker utilizada.')


def validate(archive):
    members = archive.getmembers()
    names = set()
    for item in members:
        name = pathlib.PurePosixPath(item.name)
        if (item.name in ('.workflow.lock', '.restore-in-progress') or
                not item.name or name.is_absolute() or '..' in name.parts or
                str(name) != item.name or item.name in names or
                not (item.isfile() or item.isdir())):
            raise ValueError('Respaldo con rutas, enlaces o entradas no admitidas')
        names.add(item.name)
    info = archive.getmember(MANIFEST)
    if not info.isfile() or info.size > 32 * 1024 * 1024:
        raise ValueError('Manifiesto inválido')
    manifest = json.load(archive.extractfile(info))
    if (manifest['format'] != 1 or manifest['postgres_major'] != '16' or
            manifest['architecture'] != platform.machine()):
        raise ValueError('Formato, versión PostgreSQL o arquitectura incompatible')
    entries = manifest['entries']
    if names != set(entries) | {MANIFEST}:
        raise ValueError('El contenido no coincide con el manifiesto')
    for name in ('postgres', 'postgres/PG_VERSION', 'db-password', 'initial-admin.json', 'uploads'):
        if name not in entries:
            raise ValueError(f'Respaldo incompleto: falta {name}')
    for item in members:
        if item.name == MANIFEST:
            continue
        entry = entries[item.name]
        if item.isdir():
            if entry['kind'] != 'directory':
                raise ValueError('Tipo de archivo inconsistente')
        elif (entry['kind'] != 'file' or entry['size'] != item.size or
              digest(archive.extractfile(item)) != entry['sha256']):
            raise ValueError(f'Integridad incorrecta: {item.name}')
        for parent in pathlib.PurePosixPath(item.name).parents:
            if str(parent) != '.' and entries.get(str(parent), {}).get('kind') != 'directory':
                raise ValueError('Directorio padre inválido')
    return members


def restore(path):
    if any(p.name != '.workflow.lock' for p in ROOT.iterdir()):
        raise ValueError('La restauración requiere un volumen vacío; no se sobrescriben datos')
    with gzip.open(path, 'rb') as compressed:
        digest(compressed)  # Comprueba también CRC/truncamientos hasta el final gzip.
    with tarfile.open(path, 'r:gz') as archive:
        members = validate(archive)  # Validar todo antes de escribir datos.
        marker = ROOT / '.restore-in-progress'
        marker.touch(exist_ok=False)
        for item in sorted(members, key=lambda m: (len(pathlib.PurePosixPath(m.name).parts), m.name)):
            if item.name == MANIFEST:
                continue
            target = ROOT / item.name
            if item.isdir():
                target.mkdir(mode=0o700)
            else:
                with target.open('xb') as output, archive.extractfile(item) as source:
                    while chunk := source.read(1024 * 1024):
                        output.write(chunk)
            user = 'postgres' if item.name.split('/')[0] == 'postgres' else (
                'node' if item.name.split('/')[0] == 'uploads' else 'root')
            account = pwd.getpwnam(user)
            os.chown(target, account.pw_uid, account.pw_gid)
            os.chmod(target, item.mode & 0o777)  # No restaurar bits setuid/setgid.
        check_database(allow_restore=True)
        marker.unlink()
    print('Restauración completada; inicia Workflow con este volumen.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['backup', 'restore'])
    parser.add_argument('file', type=pathlib.Path)
    args = parser.parse_args()
    ROOT.mkdir(exist_ok=True)
    with (ROOT / '.workflow.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('Detén Workflow: el volumen está en uso')
        (backup if args.action == 'backup' else restore)(args.file)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'ERROR: {error}', file=__import__('sys').stderr)
        raise SystemExit(1)
