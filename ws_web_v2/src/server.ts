import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Rutas públicas conocidas — cualquier otra devuelve 404 HTTP real.
 * Angular renderiza el componente NotFound, pero con status 404
 * para que Google lo trate correctamente y no lo indexe como 200.
 */
const PUBLIC_ROUTES = [
  /^\/$/,
  /^\/home$/,
  /^\/pricing$/,
  /^\/reviews$/,
  /^\/login$/,
  /^\/register$/,
  /^\/sitemap\.xml$/,
  /^\/robots\.txt$/,
  /^\/manifest\.webmanifest$/,
  /^\/assets\//,
];

app.use('/**', (req, res, next) => {
  const isPublic = PUBLIC_ROUTES.some(pattern => pattern.test(req.path));

  if (!isPublic) {
    // Rutas desconocidas → SSR renderiza el 404 con status HTTP correcto
    res.status(404);
  }

  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);