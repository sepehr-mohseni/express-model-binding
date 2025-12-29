import { Request, Response } from 'express';
import { IORMAdapter, BindOptions, BindingContext, BindingResult } from './types';
import { AdapterNotSetError, ModelNotFoundError, BindingError } from '../errors';
import { Cache } from '../utils/cache';
import { logger } from '../utils/logger';

/**
 * Express request with bound models
 */
interface RequestWithModels extends Request {
  [key: string]: unknown;
}

/**
 * Central model binding orchestrator
 */
export class ModelBinder {
  private static adapter: IORMAdapter | null = null;
  private static cache = new Cache();
  private static debug = false;

  static setAdapter(adapter: IORMAdapter): void {
    if (!adapter) {
      throw new Error('Adapter cannot be null or undefined');
    }
    this.adapter = adapter;
    logger.debug(`Adapter set: ${adapter.name}`);
  }

  static getAdapter(): IORMAdapter {
    if (!this.adapter) {
      throw new AdapterNotSetError(
        'No adapter set. Call ModelBinder.setAdapter() before using model binding.'
      );
    }
    return this.adapter;
  }

  static hasAdapter(): boolean {
    return this.adapter !== null;
  }

  static clearAdapter(): void {
    this.adapter = null;
    logger.debug('Adapter cleared');
  }

  static setDebug(enabled: boolean): void {
    this.debug = enabled;
    if (enabled) {
      logger.enable();
    } else {
      logger.disable();
    }
  }

  static isDebugEnabled(): boolean {
    return this.debug;
  }

  static clearCache(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  static getCacheStats(): { size: number; maxSize: number } {
    return this.cache.getStats();
  }

  static async bind(
    req: Request,
    res: Response,
    paramName: string,
    model: unknown,
    options: BindOptions = {}
  ): Promise<BindingResult> {
    const startTime = Date.now();
    const adapter = this.getAdapter();
    const paramValue = req.params[paramName];

    const context: BindingContext = {
      req,
      res,
      paramName,
      paramValue,
      model,
      options,
      adapter,
      startTime,
    };

    try {
      if (paramValue === undefined || paramValue === null || paramValue === '') {
        if (options.optional) {
          const attachAs = options.as || paramName;
          this.attachToRequest(req, attachAs, undefined);

          return {
            success: true,
            model: undefined,
            duration: Date.now() - startTime,
          };
        }

        throw new BindingError(
          `Parameter '${paramName}' is required but was not provided`,
          new Error('Missing parameter')
        );
      }

      if (!adapter.isValidModel(model)) {
        throw new BindingError(
          `Invalid model for ${adapter.name} adapter`,
          new Error('Model validation failed')
        );
      }

      const key = options.key || adapter.getPrimaryKeyName(model);

      let value: unknown = context.paramValue;
      if (options.transformValue) {
        value = options.transformValue(paramValue);
      } else {
        value = adapter.transformValue(model, key, paramValue);
      }

      const cacheKey = this.getCacheKey(model, key, value, options);
      if (options.cache) {
        const cached = this.cache.get(cacheKey);
        if (cached !== null) {
          logger.debug(`Cache hit for ${paramName}:${value}`);

          const attachAs = options.as || paramName;
          this.attachToRequest(req, attachAs, cached);

          return {
            success: true,
            model: cached,
            duration: Date.now() - startTime,
            fromCache: true,
          };
        }
      }

      logger.debug(`Fetching ${paramName}:${value} using ${adapter.name}`);
      const result = await adapter.findByKey(model, key, value, options);

      if (!result) {
        if (options.optional) {
          const attachAs = options.as || paramName;
          this.attachToRequest(req, attachAs, undefined);

          return {
            success: true,
            model: undefined,
            duration: Date.now() - startTime,
          };
        }

        let error: Error;
        if (options.errorMessage) {
          error = new ModelNotFoundError(
            paramName,
            String(value),
            this.getModelName(model),
            options.errorMessage
          );
        } else if (options.onNotFound) {
          error =
            typeof options.onNotFound === 'function'
              ? options.onNotFound(paramName, String(value))
              : options.onNotFound;
        } else {
          error = new ModelNotFoundError(paramName, String(value), this.getModelName(model));
        }

        throw error;
      }

      if (options.validate) {
        await options.validate(result, req);
      }

      if (options.cache) {
        const ttl = options.cacheTTL || (typeof options.cache === 'number' ? options.cache : 60000);
        this.cache.set(cacheKey, result, ttl);
        logger.debug(`Cached ${paramName}:${value} for ${ttl}ms`);
      }

      const attachAs = options.as || paramName;
      this.attachToRequest(req, attachAs, result);

      logger.debug(`Successfully bound ${paramName}:${value}`);

      return {
        success: true,
        model: result,
        duration: Date.now() - startTime,
        fromCache: false,
      };
    } catch (error) {
      logger.error(`Failed to bind ${paramName}:${context.paramValue}`, error);

      return {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  private static attachToRequest(req: Request, key: string, value: unknown): void {
    (req as RequestWithModels)[key] = value;
  }

  private static getCacheKey(
    model: unknown,
    key: string,
    value: unknown,
    options: BindOptions
  ): string {
    const modelName = this.getModelName(model);
    const optionsHash = JSON.stringify({
      key,
      include: options.include,
      where: options.where,
      select: options.select,
    });

    return `${modelName}:${key}:${String(value)}:${optionsHash}`;
  }

  private static getModelName(model: unknown): string {
    if (typeof model === 'string') {
      return model;
    }
    if (model && typeof model === 'object') {
      const obj = model as Record<string, unknown>;
      if (typeof obj.name === 'string') return obj.name;
      if (typeof obj.modelName === 'string') return obj.modelName;
      if (typeof obj.tableName === 'string') return obj.tableName;
    }
    if (model && typeof model === 'function') {
      return (model as { name: string }).name || 'Unknown';
    }
    return 'Unknown';
  }

  static reset(): void {
    this.adapter = null;
    this.cache.clear();
    this.debug = false;
    logger.disable();
  }
}
