/**
 * Minimal leveled logger. Writes timestamped lines to stdout/stderr.
 * Level is controlled with the LOG_LEVEL env var (debug, info, warn, error).
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] || LEVELS.info;

function log(level, message, meta) {
  if (LEVELS[level] < currentLevel) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}`;
  const output = meta !== undefined ? `${line} ${JSON.stringify(meta)}` : line;
  if (level === 'error' || level === 'warn') {
    console.error(output);
  } else {
    console.log(output);
  }
}

module.exports = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
