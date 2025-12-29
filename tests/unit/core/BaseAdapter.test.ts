import { BaseAdapter } from '../../../src/core/BaseAdapter';
import { QueryOptions } from '../../../src/core/types';
import { InvalidModelError } from '../../../src/errors';

// Create a concrete implementation for testing
class TestAdapter extends BaseAdapter {
  readonly name = 'test';

  async findByKey(
    model: unknown,
    key: string,
    value: unknown,
    _options?: QueryOptions
  ): Promise<unknown> {
    return { model, key, value };
  }

  getPrimaryKeyName(_model: unknown): string {
    return 'id';
  }

  isValidModel(model: unknown): model is unknown {
    return typeof model === 'object' && model !== null;
  }
}

describe('BaseAdapter', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  describe('name', () => {
    it('should have a name property', () => {
      expect(adapter.name).toBe('test');
    });
  });

  describe('transformValue', () => {
    it('should convert numeric strings to numbers', () => {
      expect(adapter.transformValue({}, 'id', '123')).toBe(123);
      expect(adapter.transformValue({}, 'id', '0')).toBe(0);
    });

    it('should keep non-numeric strings as strings', () => {
      expect(adapter.transformValue({}, 'id', 'abc')).toBe('abc');
      expect(adapter.transformValue({}, 'id', '12.34')).toBe('12.34');
    });

    it('should handle large numbers safely', () => {
      expect(adapter.transformValue({}, 'id', '9007199254740991')).toBe(9007199254740991);
    });
  });

  describe('supportsSoftDeletes', () => {
    it('should return false by default', () => {
      expect(adapter.supportsSoftDeletes({})).toBe(false);
    });
  });

  describe('getModelMetadata', () => {
    it('should return model metadata', () => {
      const model = { name: 'TestModel', tableName: 'test_table' };
      const metadata = adapter.getModelMetadata(model);
      
      expect(metadata).toEqual({
        name: 'TestModel',
        primaryKey: 'id',
        softDeletes: false,
        adapter: 'test',
      });
    });
  });

  describe('validateModel', () => {
    it('should not throw for valid models', () => {
      expect(() => {
        // Access protected method via any cast
        (adapter as any).validateModel({ valid: true });
      }).not.toThrow();
    });

    it('should throw InvalidModelError for invalid models', () => {
      expect(() => {
        (adapter as any).validateModel(null);
      }).toThrow(InvalidModelError);
    });
  });

  describe('getModelName', () => {
    it('should return string model as-is', () => {
      expect((adapter as any).getModelName('users')).toBe('users');
    });

    it('should return name property from object', () => {
      expect((adapter as any).getModelName({ name: 'User' })).toBe('User');
    });

    it('should return modelName property from object', () => {
      expect((adapter as any).getModelName({ modelName: 'User' })).toBe('User');
    });

    it('should return tableName property from object', () => {
      expect((adapter as any).getModelName({ tableName: 'users' })).toBe('users');
    });

    it('should return function name', () => {
      function UserModel() {}
      expect((adapter as any).getModelName(UserModel)).toBe('UserModel');
    });

    it('should return Unknown for unidentifiable models', () => {
      expect((adapter as any).getModelName(123)).toBe('Unknown');
      expect((adapter as any).getModelName(null)).toBe('Unknown');
    });
  });

  describe('helper methods', () => {
    it('applySoftDeleteFilter should return queryBuilder unchanged', () => {
      const qb = { where: jest.fn() };
      expect((adapter as any).applySoftDeleteFilter(qb)).toBe(qb);
    });

    it('applyIncludes should return queryBuilder unchanged', () => {
      const qb = { include: jest.fn() };
      expect((adapter as any).applyIncludes(qb, ['relation'])).toBe(qb);
    });

    it('applySelect should return queryBuilder unchanged', () => {
      const qb = { select: jest.fn() };
      expect((adapter as any).applySelect(qb, ['field'])).toBe(qb);
    });

    it('applyWhereConditions should return queryBuilder unchanged', () => {
      const qb = { where: jest.fn() };
      expect((adapter as any).applyWhereConditions(qb, { active: true })).toBe(qb);
    });

    it('applyCustomQuery should apply the query function', () => {
      const qb = { modified: false };
      const queryFn = (q: any) => ({ ...q, modified: true });
      const result = (adapter as any).applyCustomQuery(qb, queryFn);
      expect(result.modified).toBe(true);
    });

    it('applyCustomQuery should return queryBuilder if no function provided', () => {
      const qb = { data: 'test' };
      expect((adapter as any).applyCustomQuery(qb)).toBe(qb);
    });
  });
});
