import type { Model, Document, Query, PopulateOptions, Schema } from 'mongoose';
import { BaseAdapter } from '../core/BaseAdapter';
import { QueryOptions, ModelMetadata, QueryModifier, isValidFieldName } from '../core/types';
import { BindingError } from '../errors';
import { isObjectId } from '../utils/validators';

/**
 * Mongoose model type with required schema property
 */
interface MongooseModel extends Model<Document> {
  schema: Schema;
  modelName: string;
}

/**
 * Mongoose query type
 */
type MongooseQuery = Query<Document | null, Document>;

/**
 * Type guard for Mongoose schema path
 */
interface SchemaPathType {
  instance: string;
}

function isSchemaPathType(value: unknown): value is SchemaPathType {
  return typeof value === 'object' && value !== null && 'instance' in value;
}

/**
 * Adapter for MongoDB using Mongoose ODM
 */
export class MongooseAdapter extends BaseAdapter<MongooseModel, Document, MongooseQuery> {
  readonly name = 'mongoose';

  async findByKey(
    model: MongooseModel,
    key: string,
    value: unknown,
    options: QueryOptions = {}
  ): Promise<Document | null> {
    this.validateModel(model);

    try {
      const transformedValue = this.transformValue(model, key, value as string);

      let query: MongooseQuery = model.findOne({ [key]: transformedValue });

      if (options.select && options.select.length > 0) {
        query = query.select(options.select.join(' '));
      }

      if (options.include) {
        query = this.applyIncludes(query, options.include);
      }

      if (options.where) {
        Object.entries(options.where).forEach(([field, val]) => {
          // Security: Validate field names to prevent NoSQL injection
          if (!isValidFieldName(field)) {
            throw new BindingError(
              `Invalid field name '${field}': contains disallowed characters`,
              new Error('NoSQL injection attempt detected')
            );
          }
          query = query.where(field).equals(val);
        });
      }

      if (options.query) {
        query = this.applyCustomQuery(query, options.query as QueryModifier<MongooseQuery>);
      }

      const result = await query.exec();

      if (result && this.supportsSoftDeletes(model)) {
        const doc = result as Document & {
          deleted?: boolean;
          deletedAt?: Date;
          isDeleted?: boolean;
        };
        const isDeleted = doc.deleted || doc.deletedAt || doc.isDeleted;

        if (!options.withTrashed && !options.onlyTrashed && isDeleted) {
          return null;
        }

        if (options.onlyTrashed && !isDeleted) {
          return null;
        }
      }

      return result;
    } catch (error) {
      throw new BindingError(
        `Failed to fetch ${model.modelName}: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  getPrimaryKeyName(_model: MongooseModel): string {
    return '_id';
  }

  isValidModel(model: unknown): model is MongooseModel {
    if (!model || typeof model !== 'function') {
      return false;
    }
    const m = model as Partial<MongooseModel>;
    return (
      typeof m.findOne === 'function' && typeof m.modelName === 'string' && m.schema !== undefined
    );
  }

  transformValue(model: MongooseModel, key: string, value: string): unknown {
    if (key === '_id' || key === 'id') {
      if (isObjectId(value)) {
        try {
          // Mongoose must be loaded synchronously for ObjectId construction
          // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
          const mongoose = require('mongoose');
          return new mongoose.Types.ObjectId(value);
        } catch {
          return value;
        }
      }
      return value;
    }

    const schemaType = model.schema.path(key);
    if (isSchemaPathType(schemaType) && schemaType.instance === 'Number') {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        return num;
      }
    }

    return value;
  }

  supportsSoftDeletes(model: MongooseModel): boolean {
    const schema = model.schema;
    return (
      schema.path('deleted') !== undefined ||
      schema.path('deletedAt') !== undefined ||
      schema.path('isDeleted') !== undefined
    );
  }

  getModelMetadata(model: MongooseModel): ModelMetadata {
    const schema = model.schema;
    const paths = Object.keys(schema.paths);

    return {
      name: model.modelName,
      primaryKey: '_id',
      tableName: model.collection.name,
      softDeletes: this.supportsSoftDeletes(model),
      fields: paths,
      adapter: this.name,
    };
  }

  protected applyIncludes(
    query: MongooseQuery,
    includes: string[] | Record<string, unknown>
  ): MongooseQuery {
    if (Array.isArray(includes)) {
      includes.forEach(relation => {
        query = query.populate(relation);
      });
    } else {
      Object.entries(includes).forEach(([relation, options]) => {
        if (typeof options === 'boolean' && options) {
          query = query.populate(relation);
        } else if (typeof options === 'object' && options !== null) {
          query = query.populate({
            path: relation,
            ...options,
          } as PopulateOptions);
        }
      });
    }
    return query;
  }
}
