/**
 * Global Express error handler.
 * Must be registered last (after all routes).
 */
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  console.error(`[error] ${req.method} ${req.path} — ${status}: ${message}`);
  if (status === 500) {
    console.error(err.stack);
  }

  if (res.headersSent) return next(err);

  res.status(status).json({
    error: err.code || "SERVER_ERROR",
    message,
  });
}
