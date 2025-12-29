/**
 * Log levels for the logger
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix: string;
}

/**
 * Simple logger utility for debugging
 */
class Logger {
  private config: LoggerConfig = {
    enabled: false,
    level: 'info',
    prefix: '[express-model-binding]',
  };

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  /**
   * Enable debug logging
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable debug logging
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Set custom prefix
   */
  setPrefix(prefix: string): void {
    this.config.prefix = prefix;
  }

  /**
   * Check if a message at the given level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }
    return this.levelPriority[level] >= this.levelPriority[this.config.level];
  }

  /**
   * Format log message
   */
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `${this.config.prefix} [${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: unknown): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), context !== undefined ? context : '');
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: unknown): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), context !== undefined ? context : '');
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), context !== undefined ? context : '');
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error !== undefined ? error : '');
    }
  }

  /**
   * Reset logger to default configuration
   */
  reset(): void {
    this.config = {
      enabled: false,
      level: 'info',
      prefix: '[express-model-binding]',
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

export const logger = new Logger();
