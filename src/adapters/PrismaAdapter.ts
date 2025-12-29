import { BaseAdapter } from '../core/BaseAdapter';
import { QueryOptions, ModelMetadata, QueryModifier } from '../core/types';
import { InvalidModelError, BindingError } from '../errors';
import { isUUID } from '../utils/validators';

/**
 * Prisma model delegate (dynamic accessor on PrismaClient)
 */
interface PrismaModelDelegate {
  findUnique: (args: PrismaFindArgs) => Promise<unknown>;
  findFirst: (args: PrismaFindArgs) => Promise<unknown>;
}

/**
 * Prisma find operation arguments
 */
interface PrismaFindArgs {
  where: Record<string, unknown>;
  select?: Record<string, boolean>;
  include?: Record<string, unknown>;
}

/**
 * Prisma client interface (minimal required methods)
 */
interface PrismaClientLike {
  [modelName: string]: PrismaModelDelegate | ((...args: unknown[]) => unknown);
}

/**
 * Adapter for Prisma ORM with type-safe database access
 */
export class PrismaAdapter extends BaseAdapter<string, unknown, PrismaFindArgs> {
  readonly name = 'prisma';

  constructor(private prisma: PrismaClientLike) {
    super();
  }

  getPrisma(): PrismaClientLike {
    return this.prisma;
  }

  async findByKey(
    modelName: string,
    key: string,
    value: unknown,
    options: QueryOptions = {}
  ): Promise<unknown> {
    this.validateModel(modelName);

    try {
      const model = this.prisma[modelName] as PrismaModelDelegate;

      if (!model) {
        throw new InvalidModelError(`Model '${modelName}' not found in Prisma schema`, modelName);
      }

      const transformedValue = this.transformValue(modelName, key, value as string);

      const queryOptions: PrismaFindArgs = {
        where: { [key]: transformedValue },
      };

      if (options.where) {
        queryOptions.where = {
          ...queryOptions.where,
          ...options.where,
        };
      }

      if (options.select && options.select.length > 0) {
        queryOptions.select = options.select.reduce<Record<string, boolean>>((acc, field) => {
          acc[field] = true;
          return acc;
        }, {});
      }

      if (options.include) {
        queryOptions.include = this.buildIncludeOptions(options.include);
        delete queryOptions.select;
      }

      if (options.query) {
        (options.query as QueryModifier<PrismaFindArgs>)(queryOptions);
      }

      let result: unknown = null;
      try {
        result = await model.findUnique(queryOptions);
      } catch {
        result = await model.findFirst(queryOptions);
      }

      if (!result && key !== this.getPrimaryKeyName(modelName)) {
        result = await model.findFirst(queryOptions);
      }

      return result;
    } catch (error) {
      if (error instanceof InvalidModelError) {
        throw error;
      }
      throw new BindingError(
        `Failed to fetch ${modelName}: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  getPrimaryKeyName(_modelName: string): string {
    return 'id';
  }

  isValidModel(modelName: unknown): modelName is string {
    if (typeof modelName !== 'string') {
      return false;
    }

    if (modelName.startsWith('$')) {
      return false;
    }

    return !!this.prisma[modelName];
  }

  transformValue(_modelName: string, key: string, value: string): unknown {
    if (key === 'id' || key.endsWith('Id')) {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num.toString() === value && Number.isSafeInteger(num)) {
        return num;
      }
    }

    if (isUUID(value)) {
      return value;
    }

    return value;
  }

  supportsSoftDeletes(_modelName: string): boolean {
    return false;
  }

  getModelMetadata(modelName: string): ModelMetadata {
    return {
      name: modelName,
      primaryKey: this.getPrimaryKeyName(modelName),
      softDeletes: false,
      adapter: this.name,
    };
  }

  private buildIncludeOptions(
    includes: string[] | Record<string, unknown>
  ): Record<string, unknown> {
    if (Array.isArray(includes)) {
      return includes.reduce<Record<string, boolean>>((acc, relation) => {
        acc[relation] = true;
        return acc;
      }, {});
    }

    return Object.entries(includes).reduce<Record<string, unknown>>((acc, [relation, opts]) => {
      if (typeof opts === 'boolean') {
        acc[relation] = opts;
      } else if (typeof opts === 'object' && opts !== null) {
        const nestedOpts = opts as Record<string, unknown>;
        acc[relation] = {
          ...nestedOpts,
          include: nestedOpts.include
            ? this.buildIncludeOptions(nestedOpts.include as string[] | Record<string, unknown>)
            : undefined,
        };
      }
      return acc;
    }, {});
  }
}
