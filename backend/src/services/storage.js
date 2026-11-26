/**
 * JSON file persistence.
 *
 * - Creates the data file (and its directory) if it does not exist.
 * - If the file contains invalid JSON or an unexpected shape, it is backed up
 *   to "<file>.corrupt-<timestamp>" and replaced with an empty list.
 * - Writes go to a temp file first and are then renamed, so a crash mid-write
 *   cannot leave a half-written file behind.
 * - Writes are serialized through a promise queue to avoid races.
 */
const fs = require('fs/promises');
const path = require('path');
const logger = require('../utils/logger');

const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(__dirname, '..', 'data', 'tasks.json');

let writeQueue = Promise.resolve();

async function writeFileAtomic(data) {
  const tmpFile = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fs.rename(tmpFile, DATA_FILE);
}

async function init() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    logger.info(`Data file not found, creating ${DATA_FILE}`);
    await writeFileAtomic([]);
  }
  // Read once at startup so problems are detected (and repaired) early.
  const tasks = await readTasks();
  logger.info(`Loaded ${tasks.length} task(s) from ${DATA_FILE}`);
}

async function recoverCorruptFile(reason) {
  const backup = `${DATA_FILE}.corrupt-${Date.now()}`;
  logger.warn(`Data file is invalid (${reason}); backing it up to ${backup} and starting fresh`);
  try {
    await fs.copyFile(DATA_FILE, backup);
  } catch (err) {
    logger.error('Could not back up invalid data file', { error: err.message });
  }
  await writeFileAtomic([]);
  return [];
}

function isValidTask(task) {
  return (
    task !== null &&
    typeof task === 'object' &&
    typeof task.id === 'string' &&
    typeof task.title === 'string'
  );
}

async function readTasks() {
  let raw;
  try {
    raw = await fs.readFile(DATA_FILE, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.warn('Data file disappeared, recreating it');
      await writeFileAtomic([]);
      return [];
    }
    throw err;
  }

  if (raw.trim() === '') {
    return recoverCorruptFile('file is empty');
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return recoverCorruptFile(`JSON parse error: ${err.message}`);
  }

  if (!Array.isArray(data)) {
    return recoverCorruptFile('expected a JSON array');
  }

  const valid = data.filter(isValidTask);
  if (valid.length !== data.length) {
    logger.warn(`Ignoring ${data.length - valid.length} malformed task record(s)`);
  }
  return valid;
}

/**
 * Runs `mutator(tasks)` against the current list and persists the result.
 * The mutator returns { tasks, result }; `result` is passed back to the caller.
 * Calls are queued so concurrent requests never overwrite each other.
 */
function updateTasks(mutator) {
  const run = writeQueue.then(async () => {
    const tasks = await readTasks();
    const { tasks: nextTasks, result } = await mutator(tasks);
    await writeFileAtomic(nextTasks);
    return result;
  });
  // Keep the queue alive even if this operation fails.
  writeQueue = run.catch(() => {});
  return run;
}

module.exports = { init, readTasks, updateTasks, DATA_FILE };
