import { SequelizeAdapter } from '../../../src/adapters/SequelizeAdapter';

// Mock Sequelize instance
const createMockSequelize = () => ({
  getDialect: jest.fn().mockReturnValue('postgres'),
  define: jest.fn(),
});

// Create a mock that acts like a Sequelize model class (must be a function)
const createMockModel = () => {
  const modelFn: any = function MockModel() {};
  modelFn.findOne = jest.fn();
  modelFn.findAll = jest.fn();
  modelFn.primaryKeyAttribute = 'id';
  modelFn.tableName = 'users';
  // Note: we can't set modelFn.name as it's read-only on functions
  modelFn.rawAttributes = {
    id: { primaryKey: true, type: 'INTEGER' },
    name: { type: 'STRING' },
    email: { type: 'STRING' },
    deletedAt: { type: 'DATE' },
  };
  modelFn.options = {
    paranoid: true,
  };
  return modelFn;
};

describe('SequelizeAdapter', () => {
  let adapter: SequelizeAdapter;
  let mockSequelize: ReturnType<typeof createMockSequelize>;

  beforeEach(() => {
    mockSequelize = createMockSequelize();
    adapter = new SequelizeAdapter(mockSequelize as any);
  });

  describe('constructor and properties', () => {
    it('should have the correct name', () => {
      expect(adapter.name).toBe('sequelize');
    });
  });

  describe('findByKey', () => {
    it('should find a model by primary key', async () => {
      const mockModel = createMockModel();
      const mockUser = { id: 1, name: 'John' };
      mockModel.findOne.mockResolvedValue(mockUser);

      const result = await adapter.findByKey(mockModel, 'id', 1);

      expect(mockModel.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when model not found', async () => {
      const mockModel = createMockModel();
      mockModel.findOne.mockResolvedValue(null);

      const result = await adapter.findByKey(mockModel, 'id', 999);

      expect(result).toBeNull();
    });
  });

  describe('getPrimaryKeyName', () => {
    it('should return the primary key attribute', () => {
      const mockModel = createMockModel();
      
      const result = adapter.getPrimaryKeyName(mockModel);

      expect(result).toBe('id');
    });

    it('should return "id" as fallback if primaryKeyAttribute is not set', () => {
      const mockModel = createMockModel();
      mockModel.primaryKeyAttribute = undefined;
      
      const result = adapter.getPrimaryKeyName(mockModel);

      expect(result).toBe('id');
    });
  });

  describe('isValidModel', () => {
    it('should return true for valid Sequelize model', () => {
      const mockModel = createMockModel();
      expect(adapter.isValidModel(mockModel)).toBe(true);
    });

    it('should return false for null', () => {
      expect(adapter.isValidModel(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(adapter.isValidModel(undefined)).toBe(false);
    });

    it('should return false for plain object without methods', () => {
      const invalidModel = { tableName: 'users', name: 'User' };
      expect(adapter.isValidModel(invalidModel)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(adapter.isValidModel('string')).toBe(false);
      expect(adapter.isValidModel(123)).toBe(false);
      expect(adapter.isValidModel(true)).toBe(false);
    });
  });

  describe('supportsSoftDeletes', () => {
    it('should return true for paranoid models', () => {
      const mockModel = createMockModel();
      expect(adapter.supportsSoftDeletes(mockModel)).toBe(true);
    });
  });
});
