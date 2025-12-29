import { KnexAdapter } from '../../../src/adapters/KnexAdapter';
import { QueryOptions } from '../../../src/core/types';

// Mock Knex instance and query builder
const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  whereNull: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  forUpdate: jest.fn().mockReturnThis(),
  forShare: jest.fn().mockReturnThis(),
  first: jest.fn(),
});

const createMockKnex = (queryBuilder: ReturnType<typeof createMockQueryBuilder>) => {
  const knex = jest.fn().mockReturnValue(queryBuilder);
  return knex;
};

describe('KnexAdapter', () => {
  let adapter: KnexAdapter;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let mockKnex: ReturnType<typeof createMockKnex>;

  beforeEach(() => {
    mockQueryBuilder = createMockQueryBuilder();
    mockKnex = createMockKnex(mockQueryBuilder);
    adapter = new KnexAdapter(mockKnex as any);
  });

  describe('constructor and properties', () => {
    it('should have the correct name', () => {
      expect(adapter.name).toBe('knex');
    });

    it('should set the Knex instance', () => {
      expect((adapter as any).knex).toBe(mockKnex);
    });
  });

  describe('findByKey', () => {
    it('should find a record by primary key', async () => {
      const mockUser = { id: 1, name: 'John' };
      mockQueryBuilder.first.mockResolvedValue(mockUser);

      const result = await adapter.findByKey('users', 'id', 1);

      expect(mockKnex).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id', 1);
      expect(mockQueryBuilder.first).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when no record found', async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await adapter.findByKey('users', 'id', 999);

      expect(result).toBeNull();
    });

    it('should apply select option', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 1, name: 'John' });
      const options: QueryOptions = { select: ['id', 'name'] };

      await adapter.findByKey('users', 'id', 1, options);

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(['id', 'name']);
    });

    it('should apply where conditions', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 1, name: 'John', active: true });
      const options: QueryOptions = { where: { active: true, role: 'admin' } };

      await adapter.findByKey('users', 'id', 1, options);

      // Uses where() not andWhere() for additional conditions
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('active', true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('role', 'admin');
    });

    it('should apply withTrashed option', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 1, deleted_at: null });
      const options: QueryOptions = { withTrashed: true };

      await adapter.findByKey('users', 'id', 1, options);

      // No whereNull should be called for deleted_at (soft deletes only apply to KnexModel)
      expect(mockQueryBuilder.whereNull).not.toHaveBeenCalled();
    });

    it('should not apply soft delete filter for string table names', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 1 });

      await adapter.findByKey('users', 'id', 1);

      // String table names don't support soft deletes by default
      expect(mockQueryBuilder.whereNull).not.toHaveBeenCalled();
    });

    it('should apply forUpdate lock option', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 1 });
      const options: QueryOptions = { lock: 'forUpdate' };

      await adapter.findByKey('users', 'id', 1, options);

      expect(mockQueryBuilder.forUpdate).toHaveBeenCalled();
    });

    it('should apply forShare lock option', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 1 });
      const options: QueryOptions = { lock: 'forShare' };

      await adapter.findByKey('users', 'id', 1, options);

      expect(mockQueryBuilder.forShare).toHaveBeenCalled();
    });
  });

  describe('getPrimaryKeyName', () => {
    it('should return "id" as default primary key', () => {
      expect(adapter.getPrimaryKeyName('users')).toBe('id');
    });
  });

  describe('isValidModel', () => {
    it('should return true for string model name', () => {
      expect(adapter.isValidModel('users')).toBe(true);
    });

    it('should return false for non-string model', () => {
      expect(adapter.isValidModel(null)).toBe(false);
      expect(adapter.isValidModel(undefined)).toBe(false);
      expect(adapter.isValidModel(123)).toBe(false);
      expect(adapter.isValidModel({})).toBe(false);
    });

    it('should return true for empty string (table name validation is external)', () => {
      // Knex will throw when trying to query empty string, but isValidModel just checks type
      expect(adapter.isValidModel('')).toBe(true);
    });
  });

  describe('supportsSoftDeletes', () => {
    it('should return false for string model (no soft delete config)', () => {
      expect(adapter.supportsSoftDeletes('users')).toBe(false);
    });
  });
});
