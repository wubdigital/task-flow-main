const { HttpError } = require('./errors');

const STATUSES = ['pending', 'in-progress', 'completed'];
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 1000;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkTitle(title, errors) {
  if (typeof title !== 'string' || title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string');
  } else if (title.trim().length > TITLE_MAX) {
    errors.push(`title must be at most ${TITLE_MAX} characters`);
  }
}

function checkDescription(description, errors) {
  if (description === undefined || description === null) return;
  if (typeof description !== 'string') {
    errors.push('description must be a string');
  } else if (description.trim().length > DESCRIPTION_MAX) {
    errors.push(`description must be at most ${DESCRIPTION_MAX} characters`);
  }
}

function checkStatus(status, errors, { required = false } = {}) {
  if (status === undefined && !required) return;
  if (!STATUSES.includes(status)) {
    errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  }
}

function ensureObject(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
}

function fail(errors) {
  if (errors.length > 0) {
    throw new HttpError(400, 'Validation failed', errors);
  }
}

/** Validates the body for POST /api/tasks and PUT /api/tasks/:id. */
function validateTaskInput(body) {
  ensureObject(body);
  const errors = [];
  checkTitle(body.title, errors);
  checkDescription(body.description, errors);
  checkStatus(body.status, errors);
  fail(errors);

  return {
    title: body.title.trim(),
    description: typeof body.description === 'string' ? body.description.trim() : '',
    status: body.status,
  };
}

/** Validates the body for PATCH /api/tasks/:id/status. */
function validateStatusInput(body) {
  ensureObject(body);
  const errors = [];
  checkStatus(body.status, errors, { required: true });
  fail(errors);
  return { status: body.status };
}

/** Validates optional query parameters for GET /api/tasks. */
function validateListQuery(query) {
  const errors = [];
  const { status, search } = query;
  if (status !== undefined && status !== '' && !STATUSES.includes(status)) {
    errors.push(`status filter must be one of: ${STATUSES.join(', ')}`);
  }
  if (search !== undefined && typeof search !== 'string') {
    errors.push('search must be a single string');
  }
  fail(errors);
  return {
    status: status || undefined,
    search: typeof search === 'string' ? search.trim() : undefined,
  };
}

module.exports = {
  STATUSES,
  validateTaskInput,
  validateStatusInput,
  validateListQuery,
};
