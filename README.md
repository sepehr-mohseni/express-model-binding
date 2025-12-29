# express-model-binding

[![npm version](https://badge.fury.io/js/express-model-binding.svg)](https://www.npmjs.com/package/express-model-binding)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](http://www.typescriptlang.org/)

Route model binding for Express.js. If you've used Laravel, you know how useful this pattern is—automatically resolve route parameters to database models.

Works with Knex, Mongoose, TypeORM, Sequelize, and Prisma.

## Why?

Instead of this:

```typescript
app.get('/users/:id', async (req, res) => {
  const user = await db('users').where('id', req.params.id).first();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});
```

Write this:

```typescript
app.get('/users/:user', bindModel('user', 'users'), (req, res) => {
  res.json(req.user);
});
```

## Install

```bash
npm install express-model-binding
```

Then install your ORM:

```bash
npm install knex pg          # Knex + Postgres
npm install mongoose         # MongoDB
npm install typeorm          # TypeORM
npm install sequelize        # Sequelize
npm install @prisma/client   # Prisma
```

## Setup

```typescript
import express from 'express';
import Knex from 'knex';
import { ModelBinder, KnexAdapter, bindModel } from 'express-model-binding';

const app = express();
const knex = Knex({ client: 'pg', connection: process.env.DATABASE_URL });

// Configure once at startup
ModelBinder.setAdapter(new KnexAdapter(knex));

// Use in routes
app.get('/users/:user', bindModel('user', 'users'), (req, res) => {
  res.json(req.user);
});
```

## Adapters

**Knex**
```typescript
import { KnexAdapter } from 'express-model-binding';
ModelBinder.setAdapter(new KnexAdapter(knex));
app.get('/users/:user', bindModel('user', 'users'), handler);
```

**Mongoose**
```typescript
import { MongooseAdapter } from 'express-model-binding';
ModelBinder.setAdapter(new MongooseAdapter());
app.get('/users/:user', bindModel('user', User), handler);
```

**TypeORM**
```typescript
import { TypeORMAdapter } from 'express-model-binding';
ModelBinder.setAdapter(new TypeORMAdapter(dataSource));
app.get('/users/:user', bindModel('user', User), handler);
```

**Sequelize**
```typescript
import { SequelizeAdapter } from 'express-model-binding';
ModelBinder.setAdapter(new SequelizeAdapter(sequelize));
app.get('/users/:user', bindModel('user', User), handler);
```

**Prisma**
```typescript
import { PrismaAdapter } from 'express-model-binding';
ModelBinder.setAdapter(new PrismaAdapter(prisma));
app.get('/users/:user', bindModel('user', 'user'), handler);
```

## Middleware

**bindModel** — Basic binding
```typescript
app.get('/users/:user', bindModel('user', 'users'), handler);
```

**bindModels** — Multiple models
```typescript
app.get('/users/:user/posts/:post', bindModels({
  user: { model: 'users' },
  post: { model: 'posts' },
}), handler);
```

**bindOptional** — Don't throw if missing
```typescript
app.get('/users/:user', bindOptional('user', 'users'), handler);
```

**bindByKey** — Bind by slug, email, etc.
```typescript
app.get('/posts/:slug', bindByKey('slug', 'posts', 'slug'), handler);
```

**bindAs** — Custom request property name
```typescript
app.get('/profile/:id', bindAs('id', 'users', 'profile'), handler);
```

**bindCached** — With caching
```typescript
app.get('/users/:user', bindCached('user', 'users', 60000), handler);
```

**bindWithRelations** — Eager load relations
```typescript
app.get('/users/:user', bindWithRelations('user', 'users', ['posts']), handler);
```

## Options

```typescript
bindModel('user', 'users', {
  key: 'slug',              // Field to query (default: primary key)
  optional: true,           // Don't throw 404 if not found
  select: ['id', 'name'],   // Select specific fields
  include: ['posts'],       // Load relations
  where: { active: true },  // Extra conditions
  withTrashed: true,        // Include soft-deleted
  cache: true,              // Enable caching
  cacheTTL: 30000,          // Cache duration (ms)
  errorMessage: 'Not found',
});
```

## Error Handling

```typescript
import { ModelNotFoundError } from 'express-model-binding';

app.use((err, req, res, next) => {
  if (err instanceof ModelNotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  next(err);
});
```

## Utilities

**Transformers** — Convert parameter values
```typescript
import { toNumber, toLowerCase } from 'express-model-binding';
bindModel('user', 'users', { transformValue: toNumber });
```

**Validators** — Check format before querying
```typescript
import { isUUID, isObjectId } from 'express-model-binding';
```

## Debugging

```typescript
ModelBinder.setDebug(true);
```

## API

```typescript
ModelBinder.setAdapter(adapter)   // Set ORM adapter
ModelBinder.getAdapter()          // Get current adapter
ModelBinder.clearCache()          // Clear binding cache
ModelBinder.reset()               // Reset all state
```

## License

MIT © [Sepehr Mohseni](https://github.com/sepehr-mohseni)

## Links

- [npm](https://www.npmjs.com/package/express-model-binding)
- [GitHub](https://github.com/sepehr-mohseni/express-model-binding)
- [Issues](https://github.com/sepehr-mohseni/express-model-binding/issues)
