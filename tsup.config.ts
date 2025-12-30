import { defineConfig } from 'tsup';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'adapters/KnexAdapter': 'src/adapters/KnexAdapter.ts',
    'adapters/MongooseAdapter': 'src/adapters/MongooseAdapter.ts',
    'adapters/TypeORMAdapter': 'src/adapters/TypeORMAdapter.ts',
    'adapters/SequelizeAdapter': 'src/adapters/SequelizeAdapter.ts',
    'adapters/PrismaAdapter': 'src/adapters/PrismaAdapter.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  clean: true,
  minify: isProduction,
  external: [
    'express',
    'knex',
    'mongoose',
    'typeorm',
    'sequelize',
    '@prisma/client',
    'reflect-metadata',
  ],
});
