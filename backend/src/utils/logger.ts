type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const toSerializableError = (error: unknown): Record<string, unknown> | undefined => {
  if (!(error instanceof Error)) {
    return undefined;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
};

const writeLog = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta || {}),
  };

  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
};

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => writeLog('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => writeLog('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => writeLog('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => writeLog('error', message, meta),
  errorWithException: (message: string, error: unknown, meta?: Record<string, unknown>) =>
    writeLog('error', message, {
      ...meta,
      error: toSerializableError(error),
    }),
};
