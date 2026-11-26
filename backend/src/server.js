/**
 * TaskFlow entry point: initializes storage and starts the HTTP server.
 */
const { createApp } = require('./app');
const storage = require('./services/storage');
const logger = require('./utils/logger');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  await storage.init();

  const app = createApp();
  const server = app.listen(PORT, HOST, () => {
    logger.info(`TaskFlow running at http://localhost:${PORT}`);
    logger.info(`API available at http://localhost:${PORT}/api`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Set PORT to use a different one.`);
    } else {
      logger.error('Server error', { error: err.message });
    }
    process.exit(1);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    // Force exit if connections don't close in time.
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

start().catch((err) => {
  logger.error('Failed to start TaskFlow', { error: err.message });
  process.exit(1);
});
