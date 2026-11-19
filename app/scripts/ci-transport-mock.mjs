import { createServer } from 'node:http';

const port = Number(process.env.TRANSPORT_PORT || 5178);
const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);
  let payload;

  if (url.pathname === '/api/transport/news') {
    payload = {
      items: [],
      updatedAt: null,
      stale: false,
      fallback: false,
      source: 'deterministic-ci-fixture'
    };
  } else if (url.pathname === '/api/transport/status') {
    payload = {
      bus: false,
      subway: false,
      service: 'deterministic-ci-fixture'
    };
  } else {
    // UI tests verify navigation and panels, not live transit credentials or ETAs.
    // Return a stable empty response so the Vite proxy never depends on secrets.
    payload = {
      status: 'unavailable',
      items: [],
      routes: [],
      timetable: [],
      notice: 'CI fixture: live transport APIs are disabled.'
    };
  }

  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload));
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Dongjak deterministic transport fixture listening on 127.0.0.1:${port}\n`);
});
