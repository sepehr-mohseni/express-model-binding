import type {
  DataSource,
  Repository,
  EntityTarget,
  ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';
import { BaseAdapter } from '../core/BaseAdapter';
import { QueryOptions, ModelMetadata, QueryModifier } from '../core/types';
import { BindingError } from '../errors';
import { isUUID } from '../utils/validators';

/**
 * TypeORM entity type alias for better readability
 */
export type TypeORMEntity = EntityTarget<ObjectLiteral>;

/**
 * TypeORM find options structure
 */
interface TypeORMFindOptions {
  where: Record<string, unknown>;
  select?: Record<string, boolean>;
  relations?: string[];
  withDeleted?: boolean;
}

/**
 * Adapter for TypeORM supporting SQL and NoSQL databases
 */
export class TypeORMAdapter extends BaseAdapter<
  TypeORMEntity,
  ObjectLiteral,
  SelectQueryBuilder<ObjectLiteral>
> {
  readonly name = 'typeorm';

  constructor(private dataSource: DataSource) {
    super();
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  async findByKey(
    entity: TypeORMEntity,
    key: string,
    value: unknown,
    options: QueryOptions = {}
  ): Promise<ObjectLiteral | null> {
    this.validateModel(entity);

    try {
      const repository = this.dataSource.getRepository(entity);
      const metadata = repository.metadata;

      const transformedValue = this.transformValue(entity, key, value as string);

      if (options.query || options.lock || options.onlyTrashed) {
        return await this.findWithQueryBuilder(repository, key, transformedValue, options);
      }

      const findOptions: TypeORMFindOptions = {
        where: { [key]: transformedValue },
      };

      if (options.select && options.select.length > 0) {
        findOptions.select = options.select.reduce<Record<string, boolean>>((acc, field) => {
          acc[field] = true;
          return acc;
        }, {});
      }

      if (options.include) {
        findOptions.relations = Array.isArray(options.include)
          ? options.include
          : Object.keys(options.include);
      }

      if (options.where) {
        findOptions.where = {
          ...findOptions.where,
          ...options.where,
        };
      }

      if (options.withTrashed && metadata.deleteDateColumn) {
        findOptions.withDeleted = true;
      }

      const result = await repository.findOne(findOptions);
      return result;
    } catch (error) {
      throw new BindingError(`Failed to fetch entity: ${(error as Error).message}`, error as Error);
    }
  }

  getPrimaryKeyName(entity: TypeORMEntity): string {
    try {
      const repository = this.dataSource.getRepository(entity);
      const metadata = repository.metadata;

      if (metadata.primaryColumns.length > 0) {
        return metadata.primaryColumns[0].propertyName;
      }
    } catch {
      // Fall through to default
    }
    return 'id';
  }

  isValidModel(model: unknown): model is TypeORMEntity {
    try {
      this.dataSource.getRepository(model as TypeORMEntity);
      return true;
    } catch {
      return false;
    }
  }

  transformValue(entity: TypeORMEntity, key: string, value: string): unknown {
    try {
      const repository = this.dataSource.getRepository(entity);
      const metadata = repository.metadata;
      const column = metadata.findColumnWithPropertyName(key);

      if (!column) {
        if (isUUID(value)) {
          return value;
        }
        const num = parseInt(value, 10);
        if (!isNaN(num) && num.toString() === value) {
          return num;
        }
        return value;
      }

      const columnType = String(column.type).toLowerCase();

      if (['int', 'integer', 'smallint', 'bigint', 'number'].includes(columnType)) {
        const num = parseInt(value, 10);
        return isNaN(num) ? value : num;
      }

      if (columnType === 'uuid') {
        return value;
      }

      if (columnType === 'boolean' || columnType === 'bool') {
        return value === 'true' || value === '1';
      }

      return value;
    } catch {
      return value;
    }
  }

  supportsSoftDeletes(entity: TypeORMEntity): boolean {
    try {
      const repository = this.dataSource.getRepository(entity);
      const metadata = repository.metadata;
      return !!metadata.deleteDateColumn;
    } catch {
      return false;
    }
  }

  getModelMetadata(entity: TypeORMEntity): ModelMetadata {
    try {
      const repository = this.dataSource.getRepository(entity);
      const metadata = repository.metadata;

      return {
        name: metadata.name,
        primaryKey: this.getPrimaryKeyName(entity),
        tableName: metadata.tableName,
        softDeletes: this.supportsSoftDeletes(entity),
        relations: metadata.relations.map(r => r.propertyName),
        adapter: this.name,
      };
    } catch {
      return {
        name: 'Unknown',
        primaryKey: 'id',
        softDeletes: false,
        adapter: this.name,
      };
    }
  }

  private async findWithQueryBuilder(
    repository: Repository<ObjectLiteral>,
    key: string,
    value: unknown,
    options: QueryOptions
  ): Promise<ObjectLiteral | null> {
    const metadata = repository.metadata;
    const alias = metadata.name.toLowerCase();

    let queryBuilder = repository
      .createQueryBuilder(alias)
      .where(`${alias}.${key} = :value`, { value });

    if (options.include) {
      const relations = Array.isArray(options.include)
        ? options.include
        : Object.keys(options.include);

      relations.forEach(relation => {
        queryBuilder = queryBuilder.leftJoinAndSelect(`${alias}.${relation}`, relation);
      });
    }

    if (options.where) {
      Object.entries(options.where).forEach(([field, val]) => {
        queryBuilder = queryBuilder.andWhere(`${alias}.${field} = :${field}`, { [field]: val });
      });
    }

    if (options.select && options.select.length > 0) {
      queryBuilder = queryBuilder.select(options.select.map(field => `${alias}.${field}`));
    }

    if (options.withTrashed) {
      queryBuilder = queryBuilder.withDeleted();
    } else if (options.onlyTrashed && metadata.deleteDateColumn) {
      queryBuilder = queryBuilder
        .withDeleted()
        .andWhere(`${alias}.${metadata.deleteDateColumn.propertyName} IS NOT NULL`);
    }

    if (options.lock === 'forUpdate') {
      queryBuilder = queryBuilder.setLock('pessimistic_write');
    } else if (options.lock === 'forShare') {
      queryBuilder = queryBuilder.setLock('pessimistic_read');
    }

    if (options.query) {
      queryBuilder = this.applyCustomQuery(
        queryBuilder,
        options.query as QueryModifier<SelectQueryBuilder<ObjectLiteral>>
      );
    }

    return await queryBuilder.getOne();
  }
}
