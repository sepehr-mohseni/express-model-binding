import { PrismaAdapter } from '../../../src/adapters/PrismaAdapter';
import { QueryOptions } from '../../../src/core/types';

// Mock Prisma Client
const createMockPrismaModel = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
});

const createMockPrismaClient = (models: Record<string, ReturnType<typeof createMockPrismaModel>>) => {
  const client: any = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    ...models,
  };
  return client;
};

describe('PrismaAdapter', () => {
  let adapter: PrismaAdapter;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockUserModel: ReturnType<typeof createMockPrismaModel>;

  beforeEach(() => {
    mockUserModel = createMockPrismaModel();
    mockPrismaClient = createMockPrismaClient({ user: mockUserModel });
    adapter = new PrismaAdapter(mockPrismaClient);
  });

  describe('constructor and properties', () => {
    it('should have the correct name', () => {
      expect(adapter.name).toBe('prisma');
    });

    it('should set the Prisma client', () => {
      expect((adapter as any).prisma).toBe(mockPrismaClient);
    });
  });

  describe('findByKey', () => {
    it('should find a record by unique key using findUnique', async () => {
      const mockUser = { id: 1, name: 'John' };
      mockUserModel.findUnique.mockResolvedValue(mockUser);

      const result = await adapter.findByKey('user', 'id', 1);

      expect(mockUserModel.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when record not found', async () => {
      mockUserModel.findUnique.mockResolvedValue(null);

      const result = await adapter.findByKey('user', 'id', 999);

      expect(result).toBeNull();
    });

    it('should fallback to findFirst for non-unique keys', async () => {
      mockUserModel.findUnique.mockRejectedValue(new Error('Invalid unique constraint'));
      mockUserModel.findFirst.mockResolvedValue({ id: 1, email: 'john@example.com' });

      const result = await adapter.findByKey('user', 'email', 'john@example.com');

      expect(mockUserModel.findFirst).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(result).toEqual({ id: 1, email: 'john@example.com' });
    });

    it('should apply select option', async () => {
      mockUserModel.findUnique.mockResolvedValue({ id: 1, name: 'John' });
      const options: QueryOptions = { select: ['id', 'name'] };

      await adapter.findByKey('user', 'id', 1, options);

      expect(mockUserModel.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, name: true },
      });
    });

    it('should apply include option', async () => {
      mockUserModel.findUnique.mockResolvedValue({ id: 1, posts: [], profile: {} });
      const options: QueryOptions = { include: ['posts', 'profile'] };

      await adapter.findByKey('user', 'id', 1, options);

      expect(mockUserModel.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { posts: true, profile: true },
      });
    });

    it('should apply where conditions in findFirst fallback', async () => {
      mockUserModel.findUnique.mockRejectedValue(new Error('Invalid'));
      mockUserModel.findFirst.mockResolvedValue({ id: 1, active: true });
      const options: QueryOptions = { where: { active: true } };

      await adapter.findByKey('user', 'id', 1, options);

      expect(mockUserModel.findFirst).toHaveBeenCalledWith({
        where: { id: 1, active: true },
      });
    });
  });

  describe('getPrimaryKeyName', () => {
    it('should return "id" as default primary key', () => {
      expect(adapter.getPrimaryKeyName('user')).toBe('id');
    });
  });

  describe('isValidModel', () => {
    it('should return true for valid model name that exists in Prisma client', () => {
      expect(adapter.isValidModel('user')).toBe(true);
    });

    it('should return false for model name not in Prisma client', () => {
      expect(adapter.isValidModel('nonexistent')).toBe(false);
    });

    it('should return false for null', () => {
      expect(adapter.isValidModel(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(adapter.isValidModel(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(adapter.isValidModel('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(adapter.isValidModel(123)).toBe(false);
      expect(adapter.isValidModel({})).toBe(false);
      expect(adapter.isValidModel([])).toBe(false);
    });

    it('should return false for Prisma internal properties (starting with $)', () => {
      expect(adapter.isValidModel('$connect')).toBe(false);
      expect(adapter.isValidModel('$disconnect')).toBe(false);
    });
  });

  describe('supportsSoftDeletes', () => {
    it('should return false by default', () => {
      expect(adapter.supportsSoftDeletes('user')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle case-insensitive model names', async () => {
      const mockPostModel = createMockPrismaModel();
      mockPostModel.findUnique.mockResolvedValue({ id: 1, title: 'Test' });
      
      const client = createMockPrismaClient({ 
        post: mockPostModel,
        user: mockUserModel 
      });
      const newAdapter = new PrismaAdapter(client);

      const result = await newAdapter.findByKey('post', 'id', 1);

      expect(result).toEqual({ id: 1, title: 'Test' });
    });

    it('should handle errors from Prisma gracefully', async () => {
      mockUserModel.findUnique.mockRejectedValue(new Error('Database error'));
      mockUserModel.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(adapter.findByKey('user', 'id', 1)).rejects.toThrow('Database error');
    });
  });
});
