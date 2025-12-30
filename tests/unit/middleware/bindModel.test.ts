import {
  bindModel,
  bindModels,
  bindOptional,
  bindByKey,
  bindAs,
  bindCached,
  bindWithRelations,
} from '../../../src/middleware/bindModel';
import { ModelBinder } from '../../../src/core/ModelBinder';
import { BaseAdapter } from '../../../src/core/BaseAdapter';
import { QueryOptions } from '../../../src/core/types';
import { ModelNotFoundError } from '../../../src/errors';
import { createMockRequest, createMockResponse, createMockNext } from '../../fixtures/mocks/express';

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

describe('Middleware', () => {
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    ModelBinder.reset();
    mockAdapter = new MockAdapter();
    ModelBinder.setAdapter(mockAdapter);
  });

  afterEach(() => {
    ModelBinder.reset();
  });

  describe('bindModel', () => {
    it('should bind model to request and call next', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);

      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindModel('user', 'User');
      await middleware(req, res, next);

      expect((req as any).user).toEqual(userData);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with error when model not found', async () => {
      const req = createMockRequest({ params: { user: '999' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindModel('user', 'User');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ModelNotFoundError));
    });

    it('should call next when parameter is not in route (for optional)', async () => {
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindModel('user', 'User', { optional: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should handle errors and call next with error', async () => {
      // Make the adapter throw an error
      class ErrorAdapter extends MockAdapter {
        async findByKey(): Promise<unknown> {
          throw new Error('Database error');
        }
      }
      
      const errorAdapter = new ErrorAdapter();
      ModelBinder.setAdapter(errorAdapter);

      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindModel('user', 'User');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass binding options correctly', async () => {
      const userData = { id: 1, slug: 'john-doe', name: 'John' };
      mockAdapter.setMockData('slug:john-doe', userData);

      const req = createMockRequest({ params: { slug: 'john-doe' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindModel('slug', 'User', { key: 'slug' });
      await middleware(req, res, next);

      expect((req as any).slug).toEqual(userData);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('bindModels', () => {
    it('should bind multiple models', async () => {
      const userData = { id: 1, name: 'John' };
      const postData = { id: 2, title: 'Hello World' };
      mockAdapter.setMockData('id:1', userData);
      mockAdapter.setMockData('id:2', postData);

      const req = createMockRequest({ params: { user: '1', post: '2' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindModels({
        user: { model: 'User' },
        post: { model: 'Post' },
      });
      await middleware(req, res, next);

      expect((req as any).user).toEqual(userData);
      expect((req as any).post).toEqual(postData);
      expect(next).toHaveBeenCalledWith();
    });

    it('should stop and call next with error if any model fails', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);
      // post not found

      const req = createMockRequest({ params: { user: '1', post: '999' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindModels({
        user: { model: 'User' },
        post: { model: 'Post' },
      });
      await middleware(req, res, next);

      expect((req as any).user).toEqual(userData);
      expect(next).toHaveBeenCalledWith(expect.any(ModelNotFoundError));
    });

    it('should continue for optional models that are not found', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);

      const req = createMockRequest({ params: { user: '1', post: '999' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindModels({
        user: { model: 'User' },
        post: { model: 'Post', options: { optional: true } },
      });
      await middleware(req, res, next);

      expect((req as any).user).toEqual(userData);
      expect((req as any).post).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should skip parameters not in route when optional', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);

      const req = createMockRequest({ params: { user: '1' } }); // no post param
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindModels({
        user: { model: 'User' },
        post: { model: 'Post', options: { optional: true } },
      });
      await middleware(req, res, next);

      expect((req as any).user).toEqual(userData);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('bindOptional', () => {
    it('should bind model when found', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);

      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindOptional('user', 'User');
      await middleware(req, res, next);

      expect((req as any).user).toEqual(userData);
      expect(next).toHaveBeenCalledWith();
    });

    it('should not throw error when model not found', async () => {
      const req = createMockRequest({ params: { user: '999' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindOptional('user', 'User');
      await middleware(req, res, next);

      expect((req as any).user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('bindByKey', () => {
    it('should bind model using custom key', async () => {
      const userData = { id: 1, email: 'john@example.com', name: 'John' };
      mockAdapter.setMockData('email:john@example.com', userData);

      const req = createMockRequest({ params: { email: 'john@example.com' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindByKey('email', 'User', 'email');
      await middleware(req, res, next);

      expect((req as any).email).toEqual(userData);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('bindAs', () => {
    it('should bind model with custom name on request', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);

      const req = createMockRequest({ params: { id: '1' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindAs('id', 'User', 'currentUser');
      await middleware(req, res, next);

      expect((req as any).currentUser).toEqual(userData);
      expect((req as any).id).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('bindCached', () => {
    it('should bind model with caching enabled', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);

      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindCached('user', 'User', 30000);
      await middleware(req, res, next);

      expect((req as any).user).toEqual(userData);
      expect(next).toHaveBeenCalledWith();
    });

    it('should use default TTL when not specified', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);

      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindCached('user', 'User');
      await middleware(req, res, next);

      expect((req as any).user).toEqual(userData);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('bindWithRelations', () => {
    it('should pass include option with array of relations', async () => {
      const userData = { id: 1, name: 'John', posts: [] };
      mockAdapter.setMockData('id:1', userData);

      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindWithRelations('user', 'User', ['posts', 'profile']);
      await middleware(req, res, next);

      expect((req as any).user).toEqual(userData);
      expect(next).toHaveBeenCalledWith();
    });

    it('should pass include option with object relations', async () => {
      const userData = { id: 1, name: 'John', posts: [] };
      mockAdapter.setMockData('id:1', userData);

      const req = createMockRequest({ params: { user: '1' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindWithRelations('user', 'User', {
        posts: { include: ['comments'] },
        profile: true,
      });
      await middleware(req, res, next);

      expect((req as any).user).toEqual(userData);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Security', () => {
    it('should reject __proto__ as parameter name', () => {
      expect(() => bindModel('__proto__', 'User')).toThrow(/Invalid parameter name/);
    });

    it('should reject constructor as parameter name', () => {
      expect(() => bindModel('constructor', 'User')).toThrow(/Invalid parameter name/);
    });

    it('should reject prototype as parameter name', () => {
      expect(() => bindModel('prototype', 'User')).toThrow(/Invalid parameter name/);
    });

    it('should reject invalid parameter names with special characters', () => {
      expect(() => bindModel('user-id', 'User')).toThrow(/Invalid parameter name/);
      expect(() => bindModel('user.id', 'User')).toThrow(/Invalid parameter name/);
      expect(() => bindModel('user[0]', 'User')).toThrow(/Invalid parameter name/);
    });

    it('should reject parameter names starting with numbers', () => {
      expect(() => bindModel('123user', 'User')).toThrow(/Invalid parameter name/);
    });

    it('should accept valid parameter names', () => {
      expect(() => bindModel('user', 'User')).not.toThrow();
      expect(() => bindModel('userId', 'User')).not.toThrow();
      expect(() => bindModel('user_id', 'User')).not.toThrow();
      expect(() => bindModel('_user', 'User')).not.toThrow();
    });

    it('should truncate overly long parameter values', async () => {
      const userData = { id: 1, name: 'John' };
      mockAdapter.setMockData('id:1', userData);

      const longValue = '1' + 'x'.repeat(2000);
      const req = createMockRequest({ params: { user: longValue } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = bindModel('user', 'User');
      await middleware(req, res, next);

      // Should truncate and not crash
      expect(req.params.user.length).toBeLessThanOrEqual(1024);
    });

    it('should reject reserved property names in bindModels', () => {
      // Note: { __proto__: x } in JS sets prototype, not a key, so we use Object.create
      const maliciousConfig = Object.create(null);
      maliciousConfig['constructor'] = { model: 'User' };
      expect(() => bindModels(maliciousConfig)).toThrow(/Invalid parameter name/);

      const maliciousConfig2 = Object.create(null);
      maliciousConfig2['prototype'] = { model: 'User' };
      expect(() => bindModels(maliciousConfig2)).toThrow(/Invalid parameter name/);
    });
  });
});
