import type { TgdContext } from "#/types/TgdContext";
import DataLoader from "dataloader";
import { UseMiddleware } from "type-graphql";
import Container from "typedi";
import type { Connection } from "typeorm";
import type { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import type { RelationMetadata } from "typeorm/metadata/RelationMetadata";

export function ImplicitLoaderImpl<V>(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    UseMiddleware(async ({ root, context }, next) => {
      const tgdContext = context._tgdContext as TgdContext;
      if (tgdContext.typeormGetConnection == null) {
        throw Error("typeormGetConnection is not set");
      }
      const relation = tgdContext
        .typeormGetConnection()
        .getMetadata(target.constructor)
        .findRelationWithPropertyPath(propertyKey.toString());

      if (relation == null) {
        return await next();
      }
      if (relation.inverseRelation == null) {
        throw Error(`inverseRelation is required: ${String(propertyKey)}`);
      }

      const dataloaderCls =
        relation.isOneToOneOwner || relation.isManyToOne
          ? ToOneOwnerDataloader
          : relation.isOneToOneNotOwner
          ? ToOneNotOwnerDataloader
          : relation.isOneToMany
          ? OneToManyDataloader
          : relation.isManyToMany
          ? ManyToManyDataloader
          : null;
      if (dataloaderCls == null) {
        return await next();
      }
      return await handler<V>(root, tgdContext, relation, dataloaderCls);
    })(target, propertyKey);
  };
}

async function handler<V>(
  root: any,
  { requestId, typeormGetConnection }: TgdContext,
  relation: RelationMetadata,
  dataloaderCls:
    | (new (r: RelationMetadata, c: Connection) => DataLoader<string, V | null>)
    | (new (r: RelationMetadata, c: Connection) => DataLoader<string, V[]>)
) {
  if (typeormGetConnection == null) {
    throw Error("Connection is not available");
  }

  const serviceId = `tgd-typeorm#${relation.entityMetadata.tableName}#${relation.propertyName}`;
  const container = Container.of(requestId);
  if (!container.has(serviceId)) {
    container.set(
      serviceId,
      new dataloaderCls(relation, typeormGetConnection())
    );
  }

  const dataloader = container.get<
    DataLoader<string, V> | DataLoader<string, V[]>
  >(serviceId);
  const columns = relation.entityMetadata.primaryColumns;
  const pk = columns.map((c) => c.getEntityValue(root));
  return await dataloader.load(JSON.stringify(pk));
}

class ToOneOwnerDataloader<V> extends DataLoader<string, V | null> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (pks) => {
      const relationName = relation.inverseRelation!.propertyName;
      const columns = relation.entityMetadata.primaryColumns;

      const entities = await findEntities<V>(
        relation,
        connection,
        pks,
        relationName,
        columns
      );
      const referencedColumnNames = columns.map((c) => c.propertyPath);
      const entitiesByRelationKey = await getEntitiesByRelationKey(
        entities,
        relationName,
        referencedColumnNames
      );
      return pks.map((pk) => entitiesByRelationKey[pk]?.[0] ?? null);
    });
  }
}

class ToOneNotOwnerDataloader<V> extends DataLoader<string, V | null> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (pks) => {
      const inverseRelation = relation.inverseRelation!;
      const relationName = relation.propertyName;
      const columns = inverseRelation.joinColumns;

      const entities = await findEntities<V>(
        relation,
        connection,
        pks,
        relationName,
        columns
      );
      const referencedColumnNames = columns.map(
        (c) => c.referencedColumn!.propertyPath
      );
      const entitiesByRelationKey = await getEntitiesByRelationKey<V>(
        entities,
        inverseRelation.propertyName,
        referencedColumnNames
      );
      return pks.map((pk) => entitiesByRelationKey[pk]?.[0] ?? null);
    });
  }
}

class OneToManyDataloader<V> extends DataLoader<string, V[]> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (pks) => {
      const inverseRelation = relation.inverseRelation!;
      const columns = inverseRelation.joinColumns;

      const entities = await findEntities<V>(
        relation,
        connection,
        pks,
        relation.propertyName,
        columns
      );
      const referencedColumnNames = columns.map(
        (c) => c.referencedColumn!.propertyPath
      );
      const entitiesByRelationKey = await getEntitiesByRelationKey(
        entities,
        inverseRelation.propertyName,
        referencedColumnNames
      );
      return pks.map((pk) => entitiesByRelationKey[pk] ?? []);
    });
  }
}

class ManyToManyDataloader<V> extends DataLoader<string, V[]> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (pks) => {
      const inversePropName = relation.inverseRelation!.propertyName;
      const { ownerColumns, inverseColumns } = relation.junctionEntityMetadata!;
      const [relationName, columns] = relation.isManyToManyOwner
        ? [`${inversePropName}_${relation.propertyPath}`, ownerColumns]
        : [`${relation.propertyName}_${inversePropName}`, inverseColumns];

      const entities = await findEntities<V>(
        relation,
        connection,
        pks,
        relationName,
        columns
      );
      const referencedColumnNames = columns.map(
        (c) => c.referencedColumn!.propertyPath
      );
      const entitiesByRelationKey = await getEntitiesByRelationKey(
        entities,
        inversePropName,
        referencedColumnNames
      );
      return pks.map((pk) => entitiesByRelationKey[pk] ?? []);
    });
  }
}

async function findEntities<V>(
  relation: RelationMetadata,
  connection: Connection,
  stringifiedPrimaryKeys: readonly string[],
  relationName: string,
  columnMetas: ColumnMetadata[]
): Promise<V[]> {
  const { Brackets } = await import("typeorm");

  const qb = connection.createQueryBuilder<V>(
    relation.type,
    relation.propertyName
  );

  if (relation.isOneToOneOwner || relation.isManyToOne) {
    qb.innerJoinAndSelect(
      `${relation.propertyName}.${relationName}`,
      relationName
    );
  } else if (
    relation.isOneToOneNotOwner ||
    relation.isOneToMany ||
    relation.isManyToMany
  ) {
    const inversePropName = relation.inverseRelation!.propertyName;
    qb.innerJoinAndSelect(
      `${relation.propertyName}.${inversePropName}`,
      inversePropName
    );
  } else {
    throw Error("never");
  }

  const primaryKeys = stringifiedPrimaryKeys.map((pk) => JSON.parse(pk));
  const columns = columnMetas.map((c) => `${relationName}.${c.propertyPath}`);
  const keys = columnMetas.map((c) => `${relationName}_${c.propertyAliasName}`);

  if (columnMetas.length === 1) {
    qb.where(`${columns[0]} IN (:...${keys[0]})`, {
      [keys[0]]: primaryKeys.map((pk) => pk[0]),
    });
  } else {
    // handle composite keys
    primaryKeys.forEach((pk, i) => {
      qb.orWhere(
        new Brackets((exp) => {
          columns.forEach((column, j) => {
            const key = `${i}_${keys[j]}`;
            exp.andWhere(`${column} = :${key}`, { [key]: pk[j] });
          });
        })
      );
    });
  }
  return qb.getMany();
}

async function getEntitiesByRelationKey<V>(
  entities: V[],
  inversePropName: string,
  referencedColumnNames: string[]
): Promise<{ [relationKey: string]: V[] }> {
  const entitiesByRelationKey: { [relationKey: string]: V[] } = {};
  for (const entity of entities) {
    const referencedEntities = [await (entity as any)[inversePropName]].flat();
    referencedEntities.forEach((re) => {
      const key = JSON.stringify(referencedColumnNames.map((c) => re[c]));
      entitiesByRelationKey[key] ??= [];
      entitiesByRelationKey[key].push(entity);
    });
  }
  return entitiesByRelationKey;
}
