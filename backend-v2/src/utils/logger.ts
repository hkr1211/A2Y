import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve('logs');

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatMessage(level: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

function writeToFile(filename: string, message: string): void {
  try {
    ensureLogDir();
    fs.appendFileSync(path.join(LOG_DIR, filename), message + '\n');
  } catch {
    // Silently fail if file writing fails
  }
}

export const logger = {
  info(message: string): void {
    const formatted = formatMessage('info', message);
    console.log(formatted);
    writeToFile('app.log', formatted);
  },

  warn(message: string): void {
    const formatted = formatMessage('warn', message);
    console.warn(formatted);
    writeToFile('app.log', formatted);
  },

  error(message: string, error?: unknown): void {
    const formatted = formatMessage('error', message);
    console.error(formatted);
    if (error instanceof Error) {
      console.error(error.stack);
      writeToFile('error.log', formatted + '\n' + error.stack);
    } else {
      writeToFile('error.log', formatted);
    }
  },

  debug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      const formatted = formatMessage('debug', message);
      console.debug(formatted);
    }
  },
};
