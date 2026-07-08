const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log when request comes in
  logger.info({
    type   : 'REQUEST',
    method : req.method,
    path   : req.path,
    ip     : req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Log when response goes out
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      type      : 'RESPONSE',
      method    : req.method,
      path      : req.path,
      status    : res.statusCode,
      duration  : `${duration}ms`,
      ip        : req.ip,
    });
  });

  next();
};

module.exports = requestLogger;