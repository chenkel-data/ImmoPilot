/**
 * Express Middleware für Error Handling und Logging
 */

/**
 * Async Handler Wrapper - fängt Fehler in async Route-Handlern ab
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req, res, next) {
  const error = new Error(`Route nicht gefunden: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Global Error Handler
 */
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Interner Server-Fehler';

  // Logging
  if (status >= 500) {
    console.error('[ERROR]', {
      method: req.method,
      path: req.path,
      status,
      message,
      stack: err.stack,
    });
  } else {
    console.warn('[WARN]', {
      method: req.method,
      path: req.path,
      status,
      message,
    });
  }

  // Response
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Request Logger Middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(`[${logLevel}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
}
