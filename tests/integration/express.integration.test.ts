import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import Knex from 'knex';
import { KnexAdapter } from '../../src/adapters/KnexAdapter';
import { ModelBinder } from '../../src/core/ModelBinder';
import { bindModel, bindModels, bindOptional, bindByKey, bindAs } from '../../src/middleware/bindModel';
import { ModelNotFoundError } from '../../src/errors';

describe('Express Integration Tests', () => {
  let app: Express;
  let knex: Knex.Knex;
  let adapter: KnexAdapter;

  beforeAll(async () => {
    // Setup SQLite database
    knex = Knex({
      client: 'better-sqlite3',
      connection: {
        filename: ':memory:',
      },
      useNullAsDefault: true,
    });

    // Create test tables
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('email').unique();
      table.string('slug').unique();
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    });

    await knex.schema.createTable('posts', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('content');
      table.integer('author_id').unsigned().references('id').inTable('users');
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
    // Clean and seed database
    await knex('posts').del();
    await knex('users').del();

    await knex('users').insert([
      { id: 1, name: 'John Doe', email: 'john@example.com', slug: 'john-doe', active: true },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', slug: 'jane-smith', active: true },
      { id: 3, name: 'Inactive User', email: 'inactive@example.com', slug: 'inactive', active: false },
    ]);

    await knex('posts').insert([
      { id: 1, title: 'First Post', content: 'Hello World', author_id: 1 },
      { id: 2, title: 'Second Post', content: 'Another post', author_id: 1 },
    ]);

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
  });

  describe('bindModel middleware', () => {
    it('should bind model to request and make it available in route handler', async () => {
      app.get(
        '/users/:user',
        bindModel('user', 'users'),
        (req: Request, res: Response) => {
          res.json((req as any).user);
        }
      );

      const response = await request(app).get('/users/1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should return 404 when model not found', async () => {
      app.get(
        '/users/:user',
        bindModel('user', 'users'),
        (req: Request, res: Response) => {
          res.json((req as any).user);
        }
      );

      // Error handler
      app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        if (err instanceof ModelNotFoundError) {
          res.status(404).json({ error: err.message });
        } else {
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

      const response = await request(app).get('/users/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('bindByKey middleware', () => {
    it('should bind model using custom key (slug)', async () => {
      app.get(
        '/users/by-slug/:slug',
        bindByKey('slug', 'users', 'slug'),
        (req: Request, res: Response) => {
          res.json((req as any).slug);
        }
      );

      const response = await request(app).get('/users/by-slug/john-doe');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'John Doe',
        slug: 'john-doe',
      });
    });
  });

  describe('bindAs middleware', () => {
    it('should bind model with custom property name', async () => {
      app.get(
        '/api/profile/:id',
        bindAs('id', 'users', 'currentUser'),
        (req: Request, res: Response) => {
          res.json({
            hasCurrentUser: !!(req as any).currentUser,
            user: (req as any).currentUser,
          });
        }
      );

      const response = await request(app).get('/api/profile/1');

      expect(response.status).toBe(200);
      expect(response.body.hasCurrentUser).toBe(true);
      expect(response.body.user.name).toBe('John Doe');
    });
  });

  describe('bindOptional middleware', () => {
    it('should not throw when model not found', async () => {
      app.get(
        '/users/:user/optional',
        bindOptional('user', 'users'),
        (req: Request, res: Response) => {
          res.json({
            found: !!(req as any).user,
            user: (req as any).user || null,
          });
        }
      );

      const response = await request(app).get('/users/999/optional');

      expect(response.status).toBe(200);
      expect(response.body.found).toBe(false);
      expect(response.body.user).toBeNull();
    });

    it('should bind model when found', async () => {
      app.get(
        '/users/:user/optional',
        bindOptional('user', 'users'),
        (req: Request, res: Response) => {
          res.json({
            found: !!(req as any).user,
            user: (req as any).user,
          });
        }
      );

      const response = await request(app).get('/users/1/optional');

      expect(response.status).toBe(200);
      expect(response.body.found).toBe(true);
      expect(response.body.user.name).toBe('John Doe');
    });
  });

  describe('bindModels middleware', () => {
    it('should bind multiple models', async () => {
      app.get(
        '/users/:user/posts/:post',
        bindModels({
          user: { model: 'users' },
          post: { model: 'posts' },
        }),
        (req: Request, res: Response) => {
          res.json({
            user: (req as any).user,
            post: (req as any).post,
          });
        }
      );

      const response = await request(app).get('/users/1/posts/1');

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe('John Doe');
      expect(response.body.post.title).toBe('First Post');
    });

    it('should handle mixed required and optional bindings', async () => {
      app.get(
        '/users/:user/posts/:post?',
        bindModels({
          user: { model: 'users' },
          post: { model: 'posts', options: { optional: true } },
        }),
        (req: Request, res: Response) => {
          res.json({
            user: (req as any).user,
            post: (req as any).post || null,
          });
        }
      );

      const response = await request(app).get('/users/1/posts/999');

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe('John Doe');
      expect(response.body.post).toBeNull();
    });
  });

  describe('Custom error handling', () => {
    it('should use custom error message', async () => {
      app.get(
        '/users/:user',
        bindModel('user', 'users', { errorMessage: 'User profile not found' }),
        (req: Request, res: Response) => {
          res.json((req as any).user);
        }
      );

      app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        if (err instanceof ModelNotFoundError) {
          res.status(404).json({ error: err.message });
        } else {
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

      const response = await request(app).get('/users/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User profile not found');
    });
  });

  describe('Query options in middleware', () => {
    it('should apply where conditions', async () => {
      app.get(
        '/active-users/:user',
        bindModel('user', 'users', {
          where: { active: true },
        }),
        (req: Request, res: Response) => {
          res.json((req as any).user);
        }
      );

      app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        if (err instanceof ModelNotFoundError) {
          res.status(404).json({ error: err.message });
        } else {
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

      // Active user should be found
      const activeResponse = await request(app).get('/active-users/1');
      expect(activeResponse.status).toBe(200);

      // Inactive user should not be found
      const inactiveResponse = await request(app).get('/active-users/3');
      expect(inactiveResponse.status).toBe(404);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle blog post with author', async () => {
      app.get(
        '/blog/:slug/posts/:post',
        bindModels({
          slug: { model: 'users', options: { key: 'slug' } },
          post: { model: 'posts' },
        }),
        (req: Request, res: Response) => {
          const user = (req as any).slug;
          const post = (req as any).post;
          res.json({
            author: { name: user.name, slug: user.slug },
            post: { title: post.title, content: post.content },
          });
        }
      );

      const response = await request(app).get('/blog/john-doe/posts/1');

      expect(response.status).toBe(200);
      expect(response.body.author.name).toBe('John Doe');
      expect(response.body.post.title).toBe('First Post');
    });

    it('should handle RESTful API endpoint', async () => {
      app.put(
        '/api/users/:user',
        bindModel('user', 'users'),
        async (req: Request, res: Response) => {
          const user = (req as any).user;
          // Simulate update
          res.json({
            success: true,
            user: { ...user, ...req.body },
          });
        }
      );

      const response = await request(app)
        .put('/api/users/1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe('Updated Name');
    });
  });
});
