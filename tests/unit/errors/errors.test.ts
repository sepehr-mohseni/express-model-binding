import {
  BindingError,
  ModelNotFoundError,
  AdapterNotSetError,
  InvalidModelError,
  ValidationError,
} from '../../../src/errors';

describe('Error Classes', () => {
  describe('BindingError', () => {
    it('should create a BindingError with message', () => {
      const error = new BindingError('Test error message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BindingError);
      expect(error.name).toBe('BindingError');
      expect(error.message).toBe('Test error message');
      expect(error.originalError).toBeUndefined();
    });

    it('should create a BindingError with original error', () => {
      const originalError = new Error('Original error');
      const error = new BindingError('Wrapped error', originalError);
      
      expect(error.message).toBe('Wrapped error');
      expect(error.originalError).toBe(originalError);
    });

    it('should serialize to JSON correctly', () => {
      const originalError = new Error('Original');
      const error = new BindingError('Test error', originalError);
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'BindingError',
        message: 'Test error',
        originalError: 'Original',
      });
    });

    it('should serialize to JSON without original error', () => {
      const error = new BindingError('Test error');
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'BindingError',
        message: 'Test error',
        originalError: undefined,
      });
    });

    it('should have a stack trace', () => {
      const error = new BindingError('Test error');
      expect(error.stack).toBeDefined();
    });
  });

  describe('ModelNotFoundError', () => {
    it('should create a ModelNotFoundError with all parameters', () => {
      const error = new ModelNotFoundError('user', '123', 'User');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ModelNotFoundError);
      expect(error.name).toBe('ModelNotFoundError');
      expect(error.message).toBe('User not found with user = 123');
      expect(error.paramName).toBe('user');
      expect(error.paramValue).toBe('123');
      expect(error.modelName).toBe('User');
      expect(error.statusCode).toBe(404);
    });

    it('should serialize to JSON correctly', () => {
      const error = new ModelNotFoundError('id', '456', 'Post');
      const json = error.toJSON();
      
      expect(json).toEqual({
        error: 'Not Found',
        message: 'Post not found with id = 456',
        statusCode: 404,
        param: 'id',
        value: '456',
        model: 'Post',
      });
    });

    it('should have a stack trace', () => {
      const error = new ModelNotFoundError('user', '123', 'User');
      expect(error.stack).toBeDefined();
    });
  });

  describe('AdapterNotSetError', () => {
    it('should create an AdapterNotSetError with default message', () => {
      const error = new AdapterNotSetError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AdapterNotSetError);
      expect(error.name).toBe('AdapterNotSetError');
      expect(error.message).toBe('No adapter set. Call ModelBinder.setAdapter() before using model binding.');
    });

    it('should create an AdapterNotSetError with custom message', () => {
      const error = new AdapterNotSetError('Custom error message');
      
      expect(error.message).toBe('Custom error message');
    });

    it('should serialize to JSON correctly', () => {
      const error = new AdapterNotSetError('Test message');
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'AdapterNotSetError',
        message: 'Test message',
      });
    });

    it('should have a stack trace', () => {
      const error = new AdapterNotSetError();
      expect(error.stack).toBeDefined();
    });
  });

  describe('InvalidModelError', () => {
    it('should create an InvalidModelError with message and model', () => {
      const model = { tableName: 'users' };
      const error = new InvalidModelError('Invalid model for adapter', model);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(InvalidModelError);
      expect(error.name).toBe('InvalidModelError');
      expect(error.message).toBe('Invalid model for adapter');
      expect(error.model).toBe(model);
    });

    it('should serialize to JSON correctly with string model', () => {
      const error = new InvalidModelError('Invalid model', 'users');
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'InvalidModelError',
        message: 'Invalid model',
        model: 'users',
      });
    });

    it('should serialize to JSON correctly with object model', () => {
      const model = { tableName: 'users' };
      const error = new InvalidModelError('Invalid model', model);
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'InvalidModelError',
        message: 'Invalid model',
        model: '[object Object]',
      });
    });

    it('should have a stack trace', () => {
      const error = new InvalidModelError('Test', 'model');
      expect(error.stack).toBeDefined();
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with message', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.details).toBeUndefined();
    });

    it('should create a ValidationError with custom status code', () => {
      const error = new ValidationError('Forbidden', 403);
      
      expect(error.statusCode).toBe(403);
    });

    it('should create a ValidationError with details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Validation failed', 400, details);
      
      expect(error.details).toEqual(details);
    });

    it('should serialize to JSON correctly', () => {
      const details = { field: 'name' };
      const error = new ValidationError('Invalid input', 422, details);
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'ValidationError',
        message: 'Invalid input',
        statusCode: 422,
        details: { field: 'name' },
      });
    });

    it('should have a stack trace', () => {
      const error = new ValidationError('Test');
      expect(error.stack).toBeDefined();
    });
  });
});
