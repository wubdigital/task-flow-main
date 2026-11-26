/**
 * Builds the Express application (kept separate from server.js so it can be
 * imported by tests without opening a network port).
 */
const path = require('path');
const express = require('express');
const requestLogger = require('./middleware/requestLogger');
const { apiNotFound, errorHandler } = require('./middleware/errorHandler');
const tasksRouter = require('./routes/tasks');
const healthRouter = require('./routes/health');

const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));

  // API
  app.use('/api/health', healthRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api', apiNotFound);

  // Frontend (static files)
  app.use(express.static(FRONTEND_DIR));

  // Anything else that isn't an API route falls back to the dashboard.
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
