import type { Knex } from 'knex';
import { BaseAdapter } from '../core/BaseAdapter';
import { QueryOptions, ModelMetadata, isOperatorCondition, isValidFieldName } from '../core/types';
import { BindingError } from '../errors';
import { isUUID } from '../utils/validators';

/**
 * Model definition for Knex tables with soft delete support
 */
export interface KnexModel {
  tableName: string;
  primaryKey?: string;
  softDeleteColumn?: string;
}

/**
 * Union type for Knex model inputs
 */
export type KnexModelInput = string | KnexModel;

/**
 * Type guard for KnexModel
 */
function isKnexModel(value: unknown): value is KnexModel {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as KnexModel).tableName === 'string'
  );
}

/**
 * Adapter for Knex query builder supporting PostgreSQL, MySQL, SQLite, MSSQL, Oracle
 */
export class KnexAdapter extends BaseAdapter<
  KnexModelInput,
  Record<string, unknown>,
  Knex.QueryBuilder
> {
  readonly name = 'knex';

  constructor(private knex: Knex) {
    super();
  }

  getKnex(): Knex {
    return this.knex;
  }

  async findByKey(
    model: KnexModelInput,
    key: string,
    value: unknown,
    options: QueryOptions = {}
  ): Promise<Record<string, unknown> | null> {
    this.validateModel(model);

    const tableName = this.getTableName(model);

    try {
      let query = this.knex(tableName);

      query = query.where(key, value as Knex.Value);

      if (this.supportsSoftDeletes(model) && !options.withTrashed && !options.onlyTrashed) {
        const softDeleteColumn = this.getSoftDeleteColumn(model);
        query = query.whereNull(softDeleteColumn);
      } else if (options.onlyTrashed && this.supportsSoftDeletes(model)) {
        const softDeleteColumn = this.getSoftDeleteColumn(model);
        query = query.whereNotNull(softDeleteColumn);
      }

      if (options.where) {
        query = this.applyWhereConditions(query, options.where);
      }

      if (options.select && options.select.length > 0) {
        query = query.select(options.select);
      } else {
        query = query.select('*');
      }

      if (options.query) {
        query = this.applyCustomQuery(
          query,
          options.query as (qb: Knex.QueryBuilder) => Knex.QueryBuilder
        );
      }

      if (options.lock === 'forUpdate') {
        query = query.forUpdate();
      } else if (options.lock === 'forShare') {
        query = query.forShare();
      }

      const result = await query.first();
      return (result as Record<string, unknown>) || null;
    } catch (error) {
      throw new BindingError(
        `Failed to fetch ${this.getModelName(model)}: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  getPrimaryKeyName(model: KnexModelInput): string {
    if (isKnexModel(model) && model.primaryKey) {
      return model.primaryKey;
    }
    return 'id';
  }

  isValidModel(model: unknown): model is KnexModelInput {
    return typeof model === 'string' || isKnexModel(model);
  }

  transformValue(model: KnexModelInput, key: string, value: string): unknown {
    const primaryKey = this.getPrimaryKeyName(model);

    if (key === primaryKey || key === 'id') {
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

  supportsSoftDeletes(model: KnexModelInput): boolean {
    return isKnexModel(model) && !!model.softDeleteColumn;
  }

  getModelMetadata(model: KnexModelInput): ModelMetadata {
    return {
      name: this.getModelName(model),
      primaryKey: this.getPrimaryKeyName(model),
      tableName: this.getTableName(model),
      softDeletes: this.supportsSoftDeletes(model),
      adapter: this.name,
    };
  }

  private getTableName(model: KnexModelInput): string {
    return typeof model === 'string' ? model : model.tableName;
  }

  private getSoftDeleteColumn(model: KnexModelInput): string {
    if (isKnexModel(model) && model.softDeleteColumn) {
      return model.softDeleteColumn;
    }
    return 'deleted_at';
  }

  protected applyWhereConditions(
    query: Knex.QueryBuilder,
    where: Record<string, unknown>
  ): Knex.QueryBuilder {
    Object.entries(where).forEach(([column, value]) => {
      // Security: Validate column names to prevent SQL injection
      if (!isValidFieldName(column)) {
        throw new BindingError(
          `Invalid column name '${column}': contains disallowed characters`,
          new Error('SQL injection attempt detected')
        );
      }

      if (value === null) {
        query = query.whereNull(column);
      } else if (Array.isArray(value)) {
        query = query.whereIn(column, value as Knex.Value[]);
      } else if (isOperatorCondition(value)) {
        query = query.where(column, value.operator, value.value as Knex.Value);
      } else {
        query = query.where(column, value as Knex.Value);
      }
    });
    return query;
  }
}

/**
 * Create a Knex model definition
 */
export function defineKnexModel(config: {
  tableName: string;
  primaryKey?: string;
  softDeleteColumn?: string;
}): KnexModel {
  return {
    tableName: config.tableName,
    primaryKey: config.primaryKey || 'id',
    softDeleteColumn: config.softDeleteColumn,
  };
}
