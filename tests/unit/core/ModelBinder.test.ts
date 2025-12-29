import { ModelBinder } from '../../../src/core/ModelBinder';
import { BaseAdapter } from '../../../src/core/BaseAdapter';
import { QueryOptions } from '../../../src/core/types';
import { AdapterNotSetError, ModelNotFoundError, BindingError } from '../../../src/errors';
import { createMockRequest, createMockResponse } from '../../fixtures/mocks/express';

// Mock adapter for testing
class MockAdapter extends BaseAdapter {
  readonly name = 'mock';
  private mockData: Record<string, unknown> = {};

  setMockData(key: string, value: unknown): void {
    this.mockData[key] = value;
  }

  clearMockData(): void {
    this.mockData = {};
  }

  async findByKey(
    _model: unknown,
    key: string,
    value: unknown,
    _options?: QueryOptions
  ): Promise<unknown> {
    const dataKey = `${key}:${value}`;
    return this.mockData[dataKey] || null;
  }

  getPrimaryKeyName(_model: unknown): string {
    return 'id';
  }

  isValidModel(model: unknown): model is unknown {
    return model !== null && model !== undefined;
  }
}

describe('ModelBinder', () => {
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    ModelBinder.reset();
    mockAdapter = new MockAdapter();
  });

  afterEach(() => {
    ModelBinder.reset();
  });

  describe('setAdapter', () => {
    it('should set the adapter', () => {
      ModelBinder.setAdapter(mockAdapter);
      expect(ModelBinder.getAdapter()).toBe(mockAdapter);
    });

    it('should throw error when setting null adapter', () => {
      expect(() => {
        ModelBinder.setAdapter(null as any);
      }).toThrow('Adapter cannot be null or undefined');
    });

    it('should throw error when setting undefined adapter', () => {
      expect(() => {
        ModelBinder.setAdapter(undefined as any);
      }).toThrow('Adapter cannot be null or undefined');
    });
  });

  describe('getAdapter', () => {
    it('should throw AdapterNotSetError when no adapter is set', () => {
      expect(() => {
        ModelBinder.getAdapter();
      }).toThrow(AdapterNotSetError);
    });

    it('should return the adapter when set', () => {
      ModelBinder.setAdapter(mockAdapter);
      expect(ModelBinder.getAdapter()).toBe(mockAdapter);
    });
  });

  describe('hasAdapter', () => {
    it('should return false when no adapter is set', () => {
      expect(ModelBinder.hasAdapter()).toBe(false);
    });

    it('should return true when adapter is set', () => {
      ModelBinder.setAdapter(mockAdapter);
      expect(ModelBinder.hasAdapter()).toBe(true);
    });
  });

  describe('clearAdapter', () => {
    it('should clear the adapter', () => {
      ModelBinder.setAdapter(mockAdapter);
      ModelBinder.clearAdapter();
      expect(ModelBinder.hasAdapter()).toBe(false);
    });
  });

  describe('setDebug', () => {
    it('should enable debug mode', () => {
      ModelBinder.setDebug(true);
      expect(ModelBinder.isDebugEnabled()).toBe(true);
    });

    it('should disable debug mode', () => {
      ModelBinder.setDebug(true);
      ModelBinder.setDebug(false);
      expect(ModelBinder.isDebugEnabled()).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      ModelBinder.setAdapter(mockAdapter);
      mockAdapter.setMockData('id:1', { id: 1, name: 'Test' });
      
      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      
      // First request with cache
      ModelBinder.bind(req, res, 'user', 'User', { cache: true });
      
      // Clear cache
      ModelBinder.clearCache();
      
      const stats = ModelBinder.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = ModelBinder.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
    });
  });

  describe('bind', () => {
    beforeEach(() => {
      ModelBinder.setAdapter(mockAdapter);
    });

    it('should bind a model to the request', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);
      
      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User');
      
      expect(result.success).toBe(true);
      expect(result.model).toEqual(userData);
      expect((req as any).user).toEqual(userData);
    });

    it('should throw ModelNotFoundError when model is not found', async () => {
      const req = createMockRequest({ params: { user: '999' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ModelNotFoundError);
    });

    it('should not throw error when optional and model is not found', async () => {
      const req = createMockRequest({ params: { user: '999' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User', { optional: true });
      
      expect(result.success).toBe(true);
      expect(result.model).toBeUndefined();
      expect((req as any).user).toBeUndefined();
    });

    it('should use custom key for lookup', async () => {
      const userData = { id: 1, email: 'john@example.com', name: 'John' };
      mockAdapter.setMockData('email:john@example.com', userData);
      
      const req = createMockRequest({ params: { email: 'john@example.com' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'email', 'User', { key: 'email' });
      
      expect(result.success).toBe(true);
      expect(result.model).toEqual(userData);
    });

    it('should attach model with custom name using "as" option', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);
      
      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      
      await ModelBinder.bind(req, res, 'user', 'User', { as: 'currentUser' });
      
      expect((req as any).currentUser).toEqual(userData);
    });

    it('should use custom onNotFound error', async () => {
      const customError = new Error('Custom not found error');
      const req = createMockRequest({ params: { user: '999' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User', {
        onNotFound: customError,
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(customError);
    });

    it('should use onNotFound factory function', async () => {
      const req = createMockRequest({ params: { user: '999' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User', {
        onNotFound: (param, value) => new Error(`Custom: ${param}=${value}`),
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Custom: user=999');
    });

    it('should transform value using transformValue option', async () => {
      const userData = { id: 123, name: 'John' };
      mockAdapter.setMockData('id:123', userData);
      
      const req = createMockRequest({ params: { user: '  123  ' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User', {
        transformValue: (val) => parseInt(val.trim(), 10),
      });
      
      expect(result.success).toBe(true);
      expect(result.model).toEqual(userData);
    });

    it('should cache results when cache option is enabled', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);
      
      const req1 = createMockRequest({ params: { user: '1' } });
      const res1 = createMockResponse();
      
      const result1 = await ModelBinder.bind(req1, res1, 'user', 'User', { cache: true });
      expect(result1.fromCache).toBe(false);
      
      // Clear mock data to ensure second request uses cache
      mockAdapter.clearMockData();
      
      const req2 = createMockRequest({ params: { user: '1' } });
      const res2 = createMockResponse();
      
      const result2 = await ModelBinder.bind(req2, res2, 'user', 'User', { cache: true });
      expect(result2.fromCache).toBe(true);
      expect(result2.model).toEqual(userData);
    });

    it('should use custom cache TTL', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);
      
      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User', { cache: true, cacheTTL: 30000 });
      
      expect(result.success).toBe(true);
    });

    it('should validate model using validate option', async () => {
      const userData = { id: 1, name: 'John', userId: 2 };
      mockAdapter.setMockData('id:1', userData);
      
      const req = createMockRequest({ params: { user: '1' } }) as any;
      req.user = { id: 1 }; // Current user
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User', {
        validate: (model: any, r: any) => {
          if (model.userId !== r.user.id) {
            throw new Error('Forbidden');
          }
        },
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Forbidden');
    });

    it('should handle async validation', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);
      
      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User', {
        validate: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          // No error thrown, validation passes
        },
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle missing parameter value', async () => {
      const req = createMockRequest({ params: { user: '' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(BindingError);
    });

    it('should handle null parameter value', async () => {
      const req = createMockRequest({ params: { user: null as any } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User');
      
      expect(result.success).toBe(false);
    });

    it('should handle undefined parameter value as optional', async () => {
      const req = createMockRequest({ params: { user: undefined as any } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User', { optional: true });
      
      expect(result.success).toBe(true);
      expect(result.model).toBeUndefined();
    });

    it('should throw error for invalid model', async () => {
      // Create adapter that rejects null models
      class StrictAdapter extends MockAdapter {
        isValidModel(model: unknown): model is unknown {
          return model !== null && model !== undefined && typeof model === 'string';
        }
      }
      
      const strictAdapter = new StrictAdapter();
      ModelBinder.setAdapter(strictAdapter);
      
      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', { invalid: true });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(BindingError);
    });

    it('should include duration in result', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);
      
      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req, res, 'user', 'User');
      
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      ModelBinder.setAdapter(mockAdapter);
      ModelBinder.setDebug(true);
      
      ModelBinder.reset();
      
      expect(ModelBinder.hasAdapter()).toBe(false);
      expect(ModelBinder.isDebugEnabled()).toBe(false);
    });
  });
});
