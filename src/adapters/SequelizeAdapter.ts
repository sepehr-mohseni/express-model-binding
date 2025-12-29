import type {
  Sequelize,
  Model,
  ModelStatic,
  FindOptions,
  Includeable,
  Transaction,
} from 'sequelize';
import { BaseAdapter } from '../core/BaseAdapter';
import { QueryOptions, ModelMetadata, QueryModifier } from '../core/types';
import { BindingError } from '../errors';
import { isUUID } from '../utils/validators';

/**
 * Sequelize model static type
 */
type SequelizeModelStatic = ModelStatic<Model>;

/**
 * Type guard for Sequelize model
 */
function isSequelizeModel(model: unknown): model is SequelizeModelStatic {
  if (!model || typeof model !== 'function') {
    return false;
  }
  const m = model as unknown as Record<string, unknown>;
  return (
    typeof m.findOne === 'function' &&
    typeof m.findAll === 'function' &&
    typeof m.rawAttributes === 'object'
  );
}

/**
 * Adapter for Sequelize ORM supporting PostgreSQL, MySQL, SQLite, MSSQL
 */
export class SequelizeAdapter extends BaseAdapter<SequelizeModelStatic, Model, FindOptions> {
  readonly name = 'sequelize';

  constructor(private sequelize: Sequelize) {
    super();
  }

  getSequelize(): Sequelize {
    return this.sequelize;
  }

  async findByKey(
    model: SequelizeModelStatic,
    key: string,
    value: unknown,
    options: QueryOptions = {}
  ): Promise<Model | null> {
    this.validateModel(model);

    try {
      const transformedValue = this.transformValue(model, key, value as string);

      const findOptions: FindOptions = {
        where: { [key]: transformedValue },
      };

      if (options.select && options.select.length > 0) {
        findOptions.attributes = options.select;
      }

      if (options.include) {
        findOptions.include = this.buildIncludes(options.include);
      }

      if (options.where) {
        findOptions.where = {
          ...findOptions.where,
          ...options.where,
        };
      }

      const isParanoid = model.options?.paranoid;
      if (isParanoid) {
        if (options.withTrashed) {
          findOptions.paranoid = false;
        } else if (options.onlyTrashed) {
          findOptions.paranoid = false;
          // Sequelize Op must be loaded synchronously for query construction
          // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
          const { Op: SeqOp } = require('sequelize');
          const whereClause = findOptions.where as Record<string, unknown>;
          whereClause.deletedAt = { [SeqOp.ne]: null };
        }
      }

      if (options.lock === 'forUpdate') {
        findOptions.lock = true;
      } else if (options.lock === 'forShare') {
        // Sequelize Transaction must be loaded synchronously for lock types
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { Transaction: SeqTransaction } = require('sequelize') as {
          Transaction: typeof Transaction;
        };
        findOptions.lock = SeqTransaction.LOCK.SHARE;
      }

      let result = await model.findOne(findOptions);

      if (options.query && !result) {
        result = await this.findWithCustomQuery(model, key, transformedValue, options);
      }

      return result;
    } catch (error) {
      throw new BindingError(
        `Failed to fetch ${model.name}: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  getPrimaryKeyName(model: SequelizeModelStatic): string {
    return model.primaryKeyAttribute || 'id';
  }

  isValidModel(model: unknown): model is SequelizeModelStatic {
    return isSequelizeModel(model);
  }

  transformValue(model: SequelizeModelStatic, key: string, value: string): unknown {
    const attributes = model.rawAttributes;
    const attribute = attributes?.[key];

    if (!attribute) {
      if (isUUID(value)) {
        return value;
      }
      const num = parseInt(value, 10);
      if (!isNaN(num) && num.toString() === value) {
        return num;
      }
      return value;
    }

    const attrType = attribute.type;
    const type = attrType?.constructor?.name || String(attrType);

    switch (type) {
      case 'INTEGER':
      case 'BIGINT':
      case 'SMALLINT': {
        const intNum = parseInt(value, 10);
        return isNaN(intNum) ? value : intNum;
      }

      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL': {
        const floatNum = parseFloat(value);
        return isNaN(floatNum) ? value : floatNum;
      }

      case 'BOOLEAN':
        return value === 'true' || value === '1';

      case 'UUID':
        return value;

      default:
        return value;
    }
  }

  supportsSoftDeletes(model: SequelizeModelStatic): boolean {
    return !!model.options?.paranoid;
  }

  getModelMetadata(model: SequelizeModelStatic): ModelMetadata {
    const tableName = model.tableName || model.name;
    const associations = Object.keys(model.associations || {});

    return {
      name: model.name,
      primaryKey: this.getPrimaryKeyName(model),
      tableName: tableName,
      softDeletes: this.supportsSoftDeletes(model),
      relations: associations,
      adapter: this.name,
    };
  }

  private buildIncludes(includes: string[] | Record<string, unknown>): Includeable[] {
    if (Array.isArray(includes)) {
      return includes.map(relation => ({ association: relation }));
    }

    return Object.entries(includes).map(([relation, opts]) => {
      if (typeof opts === 'boolean' && opts) {
        return { association: relation };
      }

      if (typeof opts === 'object' && opts !== null) {
        return {
          association: relation,
          ...opts,
        };
      }

      return { association: relation };
    });
  }

  private async findWithCustomQuery(
    model: SequelizeModelStatic,
    key: string,
    value: unknown,
    options: QueryOptions
  ): Promise<Model | null> {
    const findOptions: FindOptions = {
      where: { [key]: value },
    };

    if (options.query) {
      (options.query as QueryModifier<FindOptions>)(findOptions);
    }

    return await model.findOne(findOptions);
  }
}
