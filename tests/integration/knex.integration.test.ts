import Knex from 'knex';
import { KnexAdapter } from '../../src/adapters/KnexAdapter';
import { ModelBinder } from '../../src/core/ModelBinder';
import { createMockRequest, createMockResponse } from '../fixtures/mocks/express';

describe('KnexAdapter Integration Tests', () => {
  let knex: Knex.Knex;
  let adapter: KnexAdapter;

  beforeAll(async () => {
    // Create SQLite in-memory database
    knex = Knex({
      client: 'better-sqlite3',
      connection: {
        filename: ':memory:',
      },
      useNullAsDefault: true,
    });

    // Create test table
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('email').unique();
      table.string('slug').unique();
      table.boolean('active').defaultTo(true);
      table.string('role').defaultTo('user');
      table.timestamp('deleted_at').nullable();
      table.timestamps(true, true);
    });

    await knex.schema.createTable('posts', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('content');
      table.integer('user_id').unsigned().references('id').inTable('users');
      table.timestamp('deleted_at').nullable();
      table.timestamps(true, true);
    });

    adapter = new KnexAdapter(knex);
    ModelBinder.setAdapter(adapter);
  });

  afterAll(async () => {
    ModelBinder.reset();
    await knex.destroy();
  });

  beforeEach(async () => {
    // Clean tables before each test
    await knex('posts').del();
    await knex('users').del();
  });

  describe('Basic CRUD Operations', () => {
    it('should find a user by id', async () => {
      // Insert test user
      const [id] = await knex('users').insert({
        name: 'John Doe',
        email: 'john@example.com',
        slug: 'john-doe',
      });

      const result = await adapter.findByKey('users', 'id', id);

      expect(result).toMatchObject({
        id,
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should find a user by slug', async () => {
      await knex('users').insert({
        name: 'Jane Doe',
        email: 'jane@example.com',
        slug: 'jane-doe',
      });

      const result = await adapter.findByKey('users', 'slug', 'jane-doe');

      expect(result).toMatchObject({
        name: 'Jane Doe',
        slug: 'jane-doe',
      });
    });

    it('should return null for non-existent user', async () => {
      const result = await adapter.findByKey('users', 'id', 99999);
      expect(result).toBeNull();
    });

    it('should return null for non-existent slug', async () => {
      const result = await adapter.findByKey('users', 'slug', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Query Options', () => {
    it('should select specific columns', async () => {
      const [id] = await knex('users').insert({
        name: 'Select Test',
        email: 'select@example.com',
        slug: 'select-test',
      });

      const result = await adapter.findByKey('users', 'id', id, {
        select: ['id', 'name'],
      });

      expect(result).toHaveProperty('id', id);
      expect(result).toHaveProperty('name', 'Select Test');
      expect(result).not.toHaveProperty('email');
    });

    it('should apply where conditions', async () => {
      await knex('users').insert([
        { name: 'Active User', email: 'active@example.com', slug: 'active', active: true },
        { name: 'Inactive User', email: 'inactive@example.com', slug: 'inactive', active: false },
      ]);

      // Should find active user
      const activeResult = await adapter.findByKey('users', 'slug', 'active', {
        where: { active: true },
      });
      expect(activeResult).toBeTruthy();
      expect(activeResult).toHaveProperty('name', 'Active User');

      // Should not find inactive user with active:true condition
      const inactiveResult = await adapter.findByKey('users', 'slug', 'inactive', {
        where: { active: true },
      });
      expect(inactiveResult).toBeNull();
    });

    it('should apply multiple where conditions', async () => {
      await knex('users').insert([
        { name: 'Admin Active', email: 'admin@example.com', slug: 'admin', active: true, role: 'admin' },
        { name: 'User Active', email: 'user@example.com', slug: 'user', active: true, role: 'user' },
      ]);

      const result = await adapter.findByKey('users', 'active', true, {
        where: { role: 'admin' },
      });

      expect(result).toHaveProperty('name', 'Admin Active');
    });
  });

  describe('Soft Deletes with KnexModel', () => {
    it('should exclude soft deleted records by default when using KnexModel', async () => {
      const [id] = await knex('users').insert({
        name: 'Deleted User',
        email: 'deleted@example.com',
        slug: 'deleted',
        deleted_at: new Date().toISOString(),
      });

      // Use KnexModel with softDeleteColumn configured
      const UsersModel = {
        tableName: 'users',
        primaryKey: 'id',
        softDeleteColumn: 'deleted_at',
      };

      const result = await adapter.findByKey(UsersModel, 'id', id);
      expect(result).toBeNull();
    });

    it('should include soft deleted records with withTrashed option', async () => {
      const [id] = await knex('users').insert({
        name: 'Deleted User',
        email: 'deleted2@example.com',
        slug: 'deleted2',
        deleted_at: new Date().toISOString(),
      });

      // Use KnexModel with softDeleteColumn configured
      const UsersModel = {
        tableName: 'users',
        primaryKey: 'id',
        softDeleteColumn: 'deleted_at',
      };

      const result = await adapter.findByKey(UsersModel, 'id', id, {
        withTrashed: true,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty('name', 'Deleted User');
    });
  });

  describe('ModelBinder Integration', () => {
    it('should bind model using ModelBinder', async () => {
      const [id] = await knex('users').insert({
        name: 'Binder Test',
        email: 'binder@example.com',
        slug: 'binder',
      });

      const req = createMockRequest({ params: { user: String(id) } });
      const res = createMockResponse();
      
      const result = await ModelBinder.bind(req as any, res as any, 'user', 'users');

      expect(result.success).toBe(true);
      expect(result.model).toHaveProperty('name', 'Binder Test');
    });

    it('should handle caching correctly', async () => {
      const [id] = await knex('users').insert({
        name: 'Cache Test',
        email: 'cache@example.com',
        slug: 'cache',
      });

      // First call - should hit database
      const req1 = createMockRequest({ params: { user: String(id) } });
      const res1 = createMockResponse();
      const result1 = await ModelBinder.bind(req1 as any, res1 as any, 'user', 'users', { cache: true, cacheTTL: 60000 });
      expect(result1.success).toBe(true);

      // Update the record directly
      await knex('users').where('id', id).update({ name: 'Updated Name' });

      // Second call - should return cached result (old name)
      const req2 = createMockRequest({ params: { user: String(id) } });
      const res2 = createMockResponse();
      const result2 = await ModelBinder.bind(req2 as any, res2 as any, 'user', 'users', { cache: true, cacheTTL: 60000 });
      expect(result2.model).toHaveProperty('name', 'Cache Test');

      // Clear cache and fetch again
      ModelBinder.clearCache();
      const req3 = createMockRequest({ params: { user: String(id) } });
      const res3 = createMockResponse();
      const result3 = await ModelBinder.bind(req3 as any, res3 as any, 'user', 'users', { cache: true });
      expect(result3.model).toHaveProperty('name', 'Updated Name');
    });
  });

  describe('Complex Queries', () => {
    it('should handle related data scenario', async () => {
      const [userId] = await knex('users').insert({
        name: 'Post Author',
        email: 'author@example.com',
        slug: 'author',
      });

      await knex('posts').insert([
        { title: 'First Post', content: 'Content 1', user_id: userId },
        { title: 'Second Post', content: 'Content 2', user_id: userId },
      ]);

      const user = await adapter.findByKey('users', 'id', userId);
      expect(user).toBeTruthy();

      // Verify posts exist
      const posts = await knex('posts').where('user_id', userId);
      expect(posts).toHaveLength(2);
    });
  });
});
