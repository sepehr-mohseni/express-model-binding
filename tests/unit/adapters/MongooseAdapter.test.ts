import { MongooseAdapter } from '../../../src/adapters/MongooseAdapter';

// More complete Mongoose model mock - must be a function like real Mongoose models
const createMockModel = () => {
  const query = {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };
  
  // Mongoose models are functions (constructors)
  const model: any = function MockModel() {};
  model.findOne = jest.fn().mockReturnValue(query);
  model.schema = {
    paths: {
      _id: { instance: 'ObjectID' },
      name: { instance: 'String' },
      email: { instance: 'String' },
    },
    path: jest.fn().mockReturnValue(undefined), // For supportsSoftDeletes check
  };
  model.modelName = 'User';
  model._query = query;
  return model;
};

describe('MongooseAdapter', () => {
  let adapter: MongooseAdapter;

  beforeEach(() => {
    adapter = new MongooseAdapter();
  });

  describe('constructor and properties', () => {
    it('should have the correct name', () => {
      expect(adapter.name).toBe('mongoose');
    });
  });

  describe('getPrimaryKeyName', () => {
    it('should return "_id" for Mongoose models', () => {
      const mockModel = createMockModel();
      expect(adapter.getPrimaryKeyName(mockModel)).toBe('_id');
    });
  });

  describe('isValidModel', () => {
    it('should return true for valid Mongoose model', () => {
      const mockModel = createMockModel();
      expect(adapter.isValidModel(mockModel)).toBe(true);
    });

    it('should return false for null', () => {
      expect(adapter.isValidModel(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(adapter.isValidModel(undefined)).toBe(false);
    });

    it('should return false for model without schema', () => {
      const invalidModel = { modelName: 'Test' };
      expect(adapter.isValidModel(invalidModel)).toBe(false);
    });

    it('should return false for model without modelName', () => {
      const invalidModel = { schema: {} };
      expect(adapter.isValidModel(invalidModel)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(adapter.isValidModel('string')).toBe(false);
      expect(adapter.isValidModel(123)).toBe(false);
      expect(adapter.isValidModel(true)).toBe(false);
    });
  });

  describe('supportsSoftDeletes', () => {
    it('should return false when no deleted/deletedAt field', () => {
      const mockModel = createMockModel();
      expect(adapter.supportsSoftDeletes(mockModel)).toBe(false);
    });

    it('should return true when deletedAt field exists', () => {
      const mockModel = createMockModel();
      mockModel.schema.path = jest.fn((fieldName: string) => {
        if (fieldName === 'deletedAt') return { path: 'deletedAt' };
        return undefined;
      });
      expect(adapter.supportsSoftDeletes(mockModel)).toBe(true);
    });
  });

  describe('findByKey', () => {
    it('should find a document by key', async () => {
      const mockModel = createMockModel();
      const mockUser = { _id: '507f1f77bcf86cd799439011', name: 'John' };
      mockModel._query.exec.mockResolvedValue(mockUser);

      const result = await adapter.findByKey(mockModel, '_id', '507f1f77bcf86cd799439011');

      // The adapter converts valid ObjectId strings to ObjectId objects
      expect(mockModel.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when document not found', async () => {
      const mockModel = createMockModel();
      mockModel._query.exec.mockResolvedValue(null);

      const result = await adapter.findByKey(mockModel, '_id', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should query by non-id fields without transformation', async () => {
      const mockModel = createMockModel();
      mockModel._query.exec.mockResolvedValue({ name: 'John' });

      await adapter.findByKey(mockModel, 'name', 'John');

      expect(mockModel.findOne).toHaveBeenCalledWith({ name: 'John' });
    });
  });
});
