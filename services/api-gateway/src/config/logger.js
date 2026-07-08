const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, ...rest }) => {
      return JSON.stringify({ timestamp, level, message, ...rest });
    })
  ),
  transports: [
    new transports.Console(),
  ],
});

module.exports = logger;