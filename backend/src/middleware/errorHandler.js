const logger = require('../utils/logger');

/** 404 handler for unknown /api routes. */
function apiNotFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
}

/** Converts any error into a consistent JSON response. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Malformed JSON body (from express.json()).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body contains invalid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;

  if (status >= 500) {
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }

  const body = { error: err.message };
  if (err.details) body.details = err.details;
  return res.status(status).json(body);
}

module.exports = { apiNotFound, errorHandler };
