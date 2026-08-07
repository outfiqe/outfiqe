import winston from "winston";

import {
  WINSTON_LOG_DATE_PATTERN,
  WINSTON_LOG_LEVEL,
  WINSTON_LOG_LEVELS,
  WINSTON_MAX_COMBINED_LOG_FILES,
  WINSTON_MAX_ERROR_LOG_FILES,
  WINSTON_MAX_LOG_FILE_SIZE,
} from "#config/winston.config.js";
import "winston-daily-rotate-file";

const maskSensitiveData = winston.format((info) => {
  if (info.message && typeof info.message === "string" && info.message.includes("password")) {
    info.message = info.message.replace(/password:\s*\S+/gi, "password: [REDACTED]");
  }
  return info;
});

const combinedFileTransport = new winston.transports.DailyRotateFile({
  datePattern: WINSTON_LOG_DATE_PATTERN,
  filename: "src/storage/logs/combined-%DATE%.log",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.json(),
  ),
  handleExceptions: true,
  handleRejections: true,
  level: "info",
  maxFiles: WINSTON_MAX_COMBINED_LOG_FILES,
  maxSize: WINSTON_MAX_LOG_FILE_SIZE,
  zippedArchive: true,
});

const errorFileTransport = new winston.transports.DailyRotateFile({
  datePattern: WINSTON_LOG_DATE_PATTERN,
  filename: "src/storage/logs/error-%DATE%.log",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.json(),
  ),
  handleExceptions: true,
  handleRejections: true,
  level: "error",
  maxFiles: WINSTON_MAX_ERROR_LOG_FILES,
  maxSize: WINSTON_MAX_LOG_FILE_SIZE,
  zippedArchive: true,
});

const logger = winston.createLogger({
  exitOnError: false,
  format: winston.format.combine(
    maskSensitiveData(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  ),
  level: WINSTON_LOG_LEVEL,
  levels: WINSTON_LOG_LEVELS,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
      ),
      handleExceptions: true,
      handleRejections: true,
    }),
    combinedFileTransport,
    errorFileTransport,
  ],
});

export default logger;
