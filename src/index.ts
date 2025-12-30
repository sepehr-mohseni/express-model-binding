// Core exports
export { ModelBinder } from './core/ModelBinder';
export { BaseAdapter } from './core/BaseAdapter';

// Type exports
export type {
  IORMAdapter,
  QueryOptions,
  BindOptions,
  BindingContext,
  BindingResult,
  ModelMetadata,
  ModelBindingsConfig,
  ModelBindingGlobalConfig,
  CacheEntry,
  TypedRequest,
  TypedRequestHandler,
  ExtractModelType,
  MiddlewareFunction,
  OperatorCondition,
} from './core/types';

// Security exports
export { isValidFieldName, isOperatorCondition } from './core/types';

// Adapter exports
export { KnexAdapter, defineKnexModel } from './adapters/KnexAdapter';
export type { KnexModel } from './adapters/KnexAdapter';
export { MongooseAdapter } from './adapters/MongooseAdapter';
export { TypeORMAdapter } from './adapters/TypeORMAdapter';
export { SequelizeAdapter } from './adapters/SequelizeAdapter';
export { PrismaAdapter } from './adapters/PrismaAdapter';

// Middleware exports
export {
  bindModel,
  bindModels,
  bindOptional,
  bindByKey,
  bindAs,
  bindCached,
  bindWithRelations,
} from './middleware/bindModel';

// Error exports
export {
  BindingError,
  ModelNotFoundError,
  AdapterNotSetError,
  InvalidModelError,
  ValidationError,
} from './errors';

// Utility exports
export { Cache } from './utils/cache';
export { logger } from './utils/logger';
export type { LogLevel, LoggerConfig } from './utils/logger';
export * from './utils/validators';
export * from './utils/transformers';

// Version
export const VERSION = '1.1.0';
