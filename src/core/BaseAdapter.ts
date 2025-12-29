import { IORMAdapter, QueryOptions, ModelMetadata, QueryModifier } from './types';
import { InvalidModelError } from '../errors';

/**
 * Abstract base class providing common adapter functionality.
 * Extend this class to implement ORM-specific adapters.
 *
 * @typeParam TModel - Model type accepted by this adapter
 * @typeParam TResult - Result type returned by queries
 * @typeParam TQueryBuilder - ORM-specific query builder type
 */
export abstract class BaseAdapter<
  TModel = unknown,
  TResult = unknown,
  TQueryBuilder = unknown,
> implements IORMAdapter<TModel, TResult> {
  abstract readonly name: string;

  abstract findByKey(
    model: TModel,
    key: string,
    value: unknown,
    options?: QueryOptions
  ): Promise<TResult | null>;

  abstract getPrimaryKeyName(model: TModel): string;

  abstract isValidModel(model: unknown): model is TModel;

  transformValue(_model: TModel, _key: string, value: string): unknown {
    if (/^\d+$/.test(value)) {
      const num = parseInt(value, 10);
      if (!isNaN(num) && Number.isSafeInteger(num)) {
        return num;
      }
    }
    return value;
  }

  supportsSoftDeletes(_model: TModel): boolean {
    return false;
  }

  getModelMetadata(model: TModel): ModelMetadata {
    return {
      name: this.getModelName(model),
      primaryKey: this.getPrimaryKeyName(model),
      softDeletes: this.supportsSoftDeletes(model),
      adapter: this.name,
    };
  }

  protected validateModel(model: unknown): asserts model is TModel {
    if (!this.isValidModel(model)) {
      throw new InvalidModelError(`Invalid model for ${this.name} adapter`, model);
    }
  }

  protected getModelName(model: TModel): string {
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

  protected applySoftDeleteFilter(
    queryBuilder: TQueryBuilder,
    _options?: QueryOptions
  ): TQueryBuilder {
    return queryBuilder;
  }

  protected applyIncludes(
    queryBuilder: TQueryBuilder,
    _includes?: string[] | Record<string, unknown>
  ): TQueryBuilder {
    return queryBuilder;
  }

  protected applySelect(queryBuilder: TQueryBuilder, _select?: string[]): TQueryBuilder {
    return queryBuilder;
  }

  protected applyWhereConditions(
    queryBuilder: TQueryBuilder,
    _where?: Record<string, unknown>
  ): TQueryBuilder {
    return queryBuilder;
  }

  protected applyCustomQuery(
    queryBuilder: TQueryBuilder,
    queryFn?: QueryModifier<TQueryBuilder>
  ): TQueryBuilder {
    if (queryFn) {
      return queryFn(queryBuilder) as TQueryBuilder;
    }
    return queryBuilder;
  }
}
