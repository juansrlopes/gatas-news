import winston from 'winston';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

const config = getEnvConfig();

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Choose the aspect of your log customizing the log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Define which transports the logger must use to print out messages
const transports = [
  // Allow console logging only in development
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),
  // Always log errors to file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  }),
  // Log all levels to combined file in production
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  levels,
  format,
  transports,
});

export default logger;
