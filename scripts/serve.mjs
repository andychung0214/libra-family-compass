import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = fileURLToPath(new URL('../', import.meta.url));
const requestedPort = Number(process.argv[2] ?? 4173);
const port = Number.isInteger(requestedPort) && requestedPort > 0
  ? requestedPort
  : 4173;
const host = '127.0.0.1';

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(body);
}

async function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}`).pathname);
  const requested = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const absolutePath = resolve(rootDirectory, `.${requested}`);
  const relativePath = relative(rootDirectory, absolutePath);

  if (relativePath.startsWith(`..${sep}`) || relativePath === '..' || isAbsolute(relativePath)) {
    return null;
  }

  const details = await stat(absolutePath);
  return details.isDirectory() ? resolve(absolutePath, 'index.html') : absolutePath;
}

const server = createServer(async (request, response) => {
  try {
    const filePath = await resolveRequestPath(request.url ?? '/');
    if (!filePath) {
      sendText(response, 403, '禁止存取');
      return;
    }

    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    try {
      const notFoundPath = resolve(rootDirectory, '404.html');
      await stat(notFoundPath);
      response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      createReadStream(notFoundPath).pipe(response);
    } catch {
      sendText(response, 404, '找不到頁面');
    }
  }
});

server.listen(port, host, () => {
  console.log(`秤心育兒指南執行於 http://${host}:${port}`);
});
