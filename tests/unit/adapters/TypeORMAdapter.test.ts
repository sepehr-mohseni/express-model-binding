import { TypeORMAdapter } from '../../../src/adapters/TypeORMAdapter';

// Mock TypeORM DataSource and Repository
const createMockRepository = () => ({
  findOne: jest.fn(),
  metadata: {
    primaryColumns: [{ propertyName: 'id' }],
    tableName: 'users',
    targetName: 'User',
  },
});

const createMockDataSource = (repository: any) => ({
  getRepository: jest.fn().mockImplementation((entity) => {
    // Throw for invalid entities like TypeORM does
    if (entity === null || entity === undefined || typeof entity !== 'function') {
      throw new Error('Invalid entity');
    }
    return repository;
  }),
  isInitialized: true,
});

describe('TypeORMAdapter', () => {
  let adapter: TypeORMAdapter;
  let mockRepository: ReturnType<typeof createMockRepository>;
  let mockDataSource: ReturnType<typeof createMockDataSource>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockDataSource = createMockDataSource(mockRepository);
    adapter = new TypeORMAdapter(mockDataSource as any);
  });

  describe('constructor and properties', () => {
    it('should have the correct name', () => {
      expect(adapter.name).toBe('typeorm');
    });

    it('should set the DataSource', () => {
      expect((adapter as any).dataSource).toBe(mockDataSource);
    });
  });

  describe('findByKey', () => {
    it('should find an entity by primary key', async () => {
      const mockEntity = class User {};
      const mockUser = { id: 1, name: 'John' };
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await adapter.findByKey(mockEntity, 'id', 1);

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(mockEntity);
      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when entity not found', async () => {
      const mockEntity = class User {};
      mockRepository.findOne.mockResolvedValue(null);

      const result = await adapter.findByKey(mockEntity, 'id', 999);

      expect(result).toBeNull();
    });
  });

  describe('getPrimaryKeyName', () => {
    it('should return the primary key name from entity metadata', () => {
      const mockEntity = class User {};
      
      const result = adapter.getPrimaryKeyName(mockEntity);

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(mockEntity);
      expect(result).toBe('id');
    });
  });

  describe('isValidModel', () => {
    it('should return true for valid TypeORM entity class', () => {
      const mockEntity = class User {};
      expect(adapter.isValidModel(mockEntity)).toBe(true);
    });

    it('should return true for function (constructor)', () => {
      expect(adapter.isValidModel(function TestEntity() {})).toBe(true);
    });

    it('should return false for null', () => {
      expect(adapter.isValidModel(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(adapter.isValidModel(undefined)).toBe(false);
    });
  });

  describe('supportsSoftDeletes', () => {
    it('should return false for entities without deletedAt column', () => {
      const mockEntity = class User {};
      // Default repository metadata doesn't have deletedAt
      expect(adapter.supportsSoftDeletes(mockEntity)).toBe(false);
    });
  });
});
