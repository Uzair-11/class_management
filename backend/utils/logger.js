const fs = require('fs');
const path = require('path');

// Ensure root /logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });
const dbLogStream = fs.createWriteStream(path.join(logsDir, 'database.log'), { flags: 'a' });

const formatTimestamp = () => new Date().toISOString();

const logToFile = (stream, level, message) => {
  const logEntry = `[${formatTimestamp()}] [${level}] ${message}\n`;
  stream.write(logEntry);
};

const logger = {
  info: (msg) => logToFile(accessLogStream, 'INFO', msg),
  warn: (msg) => logToFile(accessLogStream, 'WARN', msg),
  error: (msg) => logToFile(errorLogStream, 'ERROR', msg),
  db: (msg) => logToFile(dbLogStream, 'DB', msg)
};

// Express middleware for logging HTTP requests to logs/access.log
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLine = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${req.ip}`;
    logger.info(logLine);
  });
  next();
};

module.exports = {
  logger,
  requestLogger
};
