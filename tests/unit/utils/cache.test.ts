import { Cache } from '../../../src/utils/cache';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache();
  });

  describe('constructor', () => {
    it('should create a cache with default max size', () => {
      const stats = cache.getStats();
      expect(stats.maxSize).toBe(1000);
      expect(stats.size).toBe(0);
    });

    it('should create a cache with custom max size', () => {
      const customCache = new Cache(500);
      const stats = customCache.getStats();
      expect(stats.maxSize).toBe(500);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', 'value1', 60000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should store and retrieve complex objects', () => {
      const obj = { id: 1, name: 'test', nested: { value: true } };
      cache.set('complex', obj, 60000);
      expect(cache.get('complex')).toEqual(obj);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should update existing values', () => {
      cache.set('key', 'value1', 60000);
      cache.set('key', 'value2', 60000);
      expect(cache.get('key')).toBe('value2');
    });

    it('should store null values', () => {
      cache.set('nullKey', null, 60000);
      expect(cache.get('nullKey')).toBeNull();
    });

    it('should store undefined values', () => {
      cache.set('undefinedKey', undefined, 60000);
      // Note: undefined stored should return null on get due to how the cache works
      expect(cache.get('undefinedKey')).toBeUndefined();
    });
  });

  describe('expiration', () => {
    it('should return null for expired entries', async () => {
      cache.set('expiring', 'value', 1); // 1ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(cache.get('expiring')).toBeNull();
    });

    it('should return value before expiration', () => {
      cache.set('notExpired', 'value', 60000);
      expect(cache.get('notExpired')).toBe('value');
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired entries', () => {
      cache.set('exists', 'value', 60000);
      expect(cache.has('exists')).toBe(true);
    });

    it('should return false for non-existent entries', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entries', async () => {
      cache.set('expired', 'value', 1);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(cache.has('expired')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an existing entry', () => {
      cache.set('toDelete', 'value', 60000);
      expect(cache.delete('toDelete')).toBe(true);
      expect(cache.get('toDelete')).toBeNull();
    });

    it('should return false when deleting non-existent entry', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);
      cache.set('key3', 'value3', 60000);
      
      cache.clear();
      
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('size', () => {
    it('should return the correct number of entries', () => {
      expect(cache.size).toBe(0);
      
      cache.set('key1', 'value1', 60000);
      expect(cache.size).toBe(1);
      
      cache.set('key2', 'value2', 60000);
      expect(cache.size).toBe(2);
      
      cache.delete('key1');
      expect(cache.size).toBe(1);
    });
  });

  describe('keys', () => {
    it('should return all cache keys', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);
      cache.set('key3', 'value3', 60000);
      
      const keys = cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array for empty cache', () => {
      expect(cache.keys()).toEqual([]);
    });
  });

  describe('prune', () => {
    it('should remove expired entries', async () => {
      cache.set('expired1', 'value1', 1);
      cache.set('expired2', 'value2', 1);
      cache.set('valid', 'value3', 60000);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const removed = cache.prune();
      
      expect(removed).toBe(2);
      expect(cache.size).toBe(1);
      expect(cache.get('valid')).toBe('value3');
    });

    it('should return 0 when no entries are expired', () => {
      cache.set('valid1', 'value1', 60000);
      cache.set('valid2', 'value2', 60000);
      
      const removed = cache.prune();
      
      expect(removed).toBe(0);
      expect(cache.size).toBe(2);
    });
  });

  describe('max size eviction', () => {
    it('should evict oldest entry when max size is reached', () => {
      const smallCache = new Cache(3);
      
      smallCache.set('key1', 'value1', 60000);
      smallCache.set('key2', 'value2', 60000);
      smallCache.set('key3', 'value3', 60000);
      
      expect(smallCache.size).toBe(3);
      
      smallCache.set('key4', 'value4', 60000);
      
      expect(smallCache.size).toBe(3);
      expect(smallCache.get('key1')).toBeNull(); // First entry evicted
      expect(smallCache.get('key4')).toBe('value4');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);
      
      const stats = cache.getStats();
      
      expect(stats).toEqual({
        size: 2,
        maxSize: 1000,
      });
    });
  });
});
