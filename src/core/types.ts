import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Generic query builder type - adapters can narrow this to their specific type
 */
export type QueryBuilder<T = unknown> = T;

/**
 * Query modifier function type
 */
export type QueryModifier<T = unknown> = (queryBuilder: QueryBuilder<T>) => QueryBuilder<T>;

/**
 * Base adapter interface that all ORM adapters must implement
 */
export interface IORMAdapter<TModel = unknown, TResult = unknown> {
  readonly name: string;

  findByKey(
    model: TModel,
    key: string,
    value: unknown,
    options?: QueryOptions
  ): Promise<TResult | null>;

  getPrimaryKeyName(model: TModel): string;

  isValidModel(model: unknown): model is TModel;

  transformValue(model: TModel, key: string, value: string): unknown;

  supportsSoftDeletes(model: TModel): boolean;

  getModelMetadata?(model: TModel): ModelMetadata;
}

/**
 * Query options for model lookups
 */
export interface QueryOptions {
  /**
   * Relations to eager load
   */
  include?: string[] | Record<string, unknown>;

  /**
   * Additional WHERE conditions
   */
  where?: Record<string, unknown>;

  /**
   * Custom query modifier - receives ORM-specific query builder
   */
  query?: QueryModifier;

  /**
   * Fields to select
   */
  select?: string[];

  /**
   * Include soft-deleted records
   */
  withTrashed?: boolean;

  /**
   * Only return soft-deleted records
   */
  onlyTrashed?: boolean;

  /**
   * Enable result caching
   */
  cache?: boolean | number;

  /**
   * Row locking for transactions
   */
  lock?: 'forUpdate' | 'forShare';
}

/**
 * Binding middleware options
 */
export interface BindOptions extends QueryOptions {
  /**
   * Field to search by (defaults to primary key)
   */
  key?: string;

  /**
   * Custom error when model not found
   */
  onNotFound?: Error | ((paramName: string, paramValue: string) => Error);

  /**
   * Transform parameter value before querying
   */
  transformValue?: (value: string) => unknown;

  /**
   * Property name for attaching model to request
   */
  as?: string;

  /**
   * Don't throw if model not found
   */
  optional?: boolean;

  /**
   * Custom 404 message
   */
  errorMessage?: string;

  /**
   * Validate loaded model
   */
  validate?: (model: unknown, req: Request) => void | Promise<void>;

  /**
   * Enable caching
   */
  cache?: boolean;

  /**
   * Cache TTL in milliseconds
   */
  cacheTTL?: number;
}

/**
 * Multi-model binding configuration
 */
export interface ModelBindingsConfig {
  [paramName: string]: {
    model: unknown;
    options?: BindOptions;
  };
}

/**
 * Binding operation context
 */
export interface BindingContext {
  req: Request;
  res: Response;
  paramName: string;
  paramValue: string;
  model: unknown;
  options: BindOptions;
  adapter: IORMAdapter;
  startTime: number;
}

/**
 * Binding operation result
 */
export interface BindingResult {
  success: boolean;
  model?: unknown;
  error?: Error;
  duration: number;
  fromCache?: boolean;
}

/**
 * Model metadata for debugging
 */
export interface ModelMetadata {
  name: string;
  primaryKey: string;
  tableName?: string;
  relations?: string[];
  softDeletes: boolean;
  adapter?: string;
  [key: string]: unknown;
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Global configuration options
 */
export interface ModelBindingGlobalConfig {
  adapter?: IORMAdapter;
  cache?: {
    enabled: boolean;
    ttl: number;
    maxSize?: number;
  };
  debug?: boolean;
  logger?: (message: string, context?: unknown) => void;
  onError?: (error: Error, context: BindingContext) => void;
}

/**
 * Express request with bound models
 */
export interface TypedRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
  Models extends Record<string, unknown> = Record<string, unknown>,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  [K: string]: unknown;
  models?: Models;
}

/**
 * Extract model type from binding config
 */
export type ExtractModelType<T> = T extends { model: infer M } ? M : never;

/**
 * Typed request handler
 */
export type TypedRequestHandler<
  Models extends Record<string, unknown> = Record<string, unknown>,
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
> = (
  req: TypedRequest<P, ResBody, ReqBody, ReqQuery, Models>,
  res: Response<ResBody>,
  next: NextFunction
) => void | Promise<void>;

/**
 * Middleware function type
 */
export type MiddlewareFunction = RequestHandler;

/**
 * Allowed SQL operators to prevent injection
 */
const ALLOWED_OPERATORS = new Set([
  '=', '!=', '<>', '<', '>', '<=', '>=',
  'like', 'ilike', 'not like', 'not ilike',
  'in', 'not in', 'between', 'not between',
  'is', 'is not', 'is null', 'is not null',
]);

/**
 * Validate field/column name to prevent injection
 * Only allows alphanumeric, underscores, and dots (for nested fields)
 */
export function isValidFieldName(name: string): boolean {
  if (!name || name.length > 128) return false;
  return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(name);
}

/**
 * Operator condition for advanced WHERE clauses
 */
export interface OperatorCondition {
  operator: string;
  value: unknown;
}

/**
 * Check if value is a valid operator condition with whitelisted operator
 */
export function isOperatorCondition(value: unknown): value is OperatorCondition {
  if (typeof value !== 'object' || value === null) return false;
  if (!('operator' in value) || !('value' in value)) return false;
  const op = (value as OperatorCondition).operator;
  if (typeof op !== 'string') return false;
  // Security: Only allow whitelisted operators
  return ALLOWED_OPERATORS.has(op.toLowerCase().trim());
}
