// HTTP directo: deriva el origen del Host real, sin confiar en cabeceras de proxy.
// ORIGIN explícito sigue disponible para un proxy HTTPS administrado.
import { createServer } from 'node:http';
import { handler } from '../../build/handler.js';

const server = createServer((request, response) => {
  request.headers['x-workflow-protocol'] = 'http';
  handler(request, response);
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0');
let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(() => process.exit(0));
    setTimeout(() => {
      server.closeAllConnections();
      process.exit(0);
    }, 5000).unref();
  });
}
