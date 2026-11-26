/**
 * Express application (no network listener here so tests can import it directly).
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { config } = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / server-to-server requests (no Origin header) and configured origins.
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS: origin not allowed'));
      },
      exposedHeaders: ['Content-Disposition'],
    })
  );
  app.use(express.json({ limit: '100kb' }));

  // Request log: method, path, status, time. No bodies or headers.
  if (!config.isTest) app.use(morgan(config.isProduction ? 'combined' : 'dev'));

  app.use('/api', apiLimiter, routes);
  app.use('/api', notFound);

  // Optional: serve the built frontend from the same server in production (single deployment).
  const distDir = path.resolve(__dirname, '../../frontend/dist');
  if (config.isProduction && fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    // '{*splat}' (optional) also matches the root path '/'.
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
