export interface LogMetadata {
  requestId?: string;
  shopId?: string;
  userId?: string;
  [key: string]: unknown;
}

export const logger = {
  info: (message: string, meta?: LogMetadata) => {
    console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), message, ...meta }));
  },
  warn: (message: string, meta?: LogMetadata) => {
    console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), message, ...meta }));
  },
  error: (message: string, error?: unknown, meta?: LogMetadata) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      ...meta
    }));
  },
  debug: (message: string, meta?: LogMetadata) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({ level: 'DEBUG', timestamp: new Date().toISOString(), message, ...meta }));
    }
  }
};
