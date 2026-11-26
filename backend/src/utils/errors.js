/**
 * Error carrying an HTTP status code. Thrown by services/validators and
 * translated into a JSON response by the error-handling middleware.
 */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (details) this.details = details;
  }
}

module.exports = { HttpError };
