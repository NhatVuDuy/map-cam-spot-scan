export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({
    error: err.code ?? 'INTERNAL_ERROR',
    message:
      process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
}
