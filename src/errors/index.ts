/**
 * Base error class for model binding errors
 */
export class BindingError extends Error {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'BindingError';
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Error thrown when a model is not found (404)
 */
export class ModelNotFoundError extends Error {
  public readonly statusCode = 404;
  public readonly paramName: string;
  public readonly paramValue: string;
  public readonly modelName: string;

  constructor(paramName: string, paramValue: string, modelName: string, customMessage?: string) {
    super(customMessage || `${modelName} not found with ${paramName} = ${paramValue}`);
    this.name = 'ModelNotFoundError';
    this.paramName = paramName;
    this.paramValue = paramValue;
    this.modelName = modelName;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      error: 'Not Found',
      message: this.message,
      statusCode: this.statusCode,
      param: this.paramName,
      value: this.paramValue,
      model: this.modelName,
    };
  }
}

/**
 * Error thrown when no adapter is configured
 */
export class AdapterNotSetError extends Error {
  constructor(
    message: string = 'No adapter set. Call ModelBinder.setAdapter() before using model binding.'
  ) {
    super(message);
    this.name = 'AdapterNotSetError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
    };
  }
}

/**
 * Error thrown when a model is invalid for an adapter
 */
export class InvalidModelError extends Error {
  public readonly model: unknown;

  constructor(message: string, model: unknown) {
    super(message);
    this.name = 'InvalidModelError';
    this.model = model;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      model: typeof this.model === 'string' ? this.model : String(this.model),
    };
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
