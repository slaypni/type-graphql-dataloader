import { TgdContext } from "#/types/TgdContext";
import DataLoader from "dataloader";
import { UseMiddleware } from "type-graphql";
import Container from "typedi";
import type { Connection } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";
import { getToManyLoadData, getToOneLoadData, query } from "./utils";

export function SimpleTypeormLoader<V>(): PropertyDecorator {
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

      const dataloaderType = relation.isOneToOneOwner
        ? OneToOneOwnerDataloader
        : relation.isOneToOneNotOwner
        ? OnetoOneNotOwnerDataloader
        : relation.isManyToOne
        ? ManyToOneDataloader
        : relation.isOneToMany
        ? OneToManyDataloader
        : relation.isManyToMany
        ? ManyToManyDataloader
        : null;
      if (dataloaderType === null) {
        return await next();
      }
      return await handler(root, tgdContext, relation, dataloaderType);
    })(target, propertyKey);
  };
}

async function handler<V>(
  root: any,
  { requestId, typeormGetConnection }: TgdContext,
  relation: RelationMetadata,
  dataloaderType: new (relation: RelationMetadata, connection: Connection) =>
    | ToOneDataloader<V>
    | ToManyDataloader<V>
) {
  if (typeormGetConnection == null) {
    throw Error("Connection is not available");
  }

  const serviceId = `tgd-typeorm#${relation.entityMetadata.tableName}#${relation.propertyName}`;
  const container = Container.of(requestId);
  if (!container.has(serviceId)) {
    container.set(
      serviceId,
      new dataloaderType(relation, typeormGetConnection())
    );
  }

  const dataloader =
    container.get<ToOneDataloader<V> | ToManyDataloader<V>>(serviceId);
  const columns = relation.entityMetadata.primaryColumns;
  const pk = columns.map((c) => c.getEntityValue(root));
  if (dataloader instanceof ToOneDataloader) {
    return (await dataloader.load(pk)) ?? null;
  } else if (dataloader instanceof ToManyDataloader) {
    return (await dataloader.loadMany([pk]))[0] ?? null;
  } else {
    throw Error("this dataloader instance is not supported");
  }
}

abstract class ToOneDataloader<V> extends DataLoader<any[], V> {}
abstract class ToManyDataloader<V> extends DataLoader<any[], V[]> {}

class OneToOneOwnerDataloader<V> extends ToOneDataloader<V> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const relationName = relation.entityMetadata.tableName;
      const columns = relation.entityMetadata.primaryColumns;
      const rawResults = await query(
        relation,
        connection,
        ids,
        relationName,
        columns
      );
      const groupColumns = columns.map(
        (c) => `${relationName}_${c.propertyAliasName}`
      );
      return getToOneLoadData(
        ids,
        rawResults,
        groupColumns,
        relation.type as new () => V,
        relationName
      );
    });
  }
}

class OnetoOneNotOwnerDataloader<V> extends ToOneDataloader<V> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const relationName = relation.propertyName;
      const columns = relation.inverseRelation!.joinColumns;
      const rawResults = await query(
        relation,
        connection,
        ids,
        relationName,
        columns
      );
      const groupColumns = columns.map(
        (c) => `${relationName}_${c.databaseName}`
      );
      return getToOneLoadData(
        ids,
        rawResults,
        groupColumns,
        relation.type as new () => V
      );
    });
  }
}

class ManyToOneDataloader<V> extends ToOneDataloader<V> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const relationName = relation.inverseRelation!.propertyName;
      const metadata = relation.entityMetadata;
      const columns = metadata.primaryColumns;
      const rawResults = await query(
        relation,
        connection,
        ids,
        relationName,
        columns
      );
      const groupColumns = columns.map(
        (c) => `${relationName}_${c.propertyAliasName}`
      );
      return getToOneLoadData(
        ids,
        rawResults,
        groupColumns,
        relation.type as new () => V,
        relationName
      );
    });
  }
}

class OneToManyDataloader<V> extends ToManyDataloader<V> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const relationName = relation.propertyName;
      const columns = relation.inverseRelation!.joinColumns;
      const rawResults = await query(
        relation,
        connection,
        ids,
        relationName,
        columns
      );
      const groupColumns = columns.map(
        (c) => `${relationName}_${c.databaseName}`
      );
      return getToManyLoadData(
        ids,
        rawResults,
        groupColumns,
        relation.type as new () => V
      );
    });
  }
}

class ManyToManyDataloader<V> extends ToManyDataloader<V> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const inversePropName = relation.inverseRelation!.propertyName;
      const relationName = `${relation.propertyName}_${inversePropName}`;
      const columns = relation.joinColumns;
      const rawResults = await query(
        relation,
        connection,
        ids,
        relationName,
        columns
      );
      const groupColumns = columns.map(
        (c) => `${inversePropName}_${c.referencedColumn!.propertyAliasName}`
      );
      return getToManyLoadData(
        ids,
        rawResults,
        groupColumns,
        relation.type as new () => V,
        inversePropName
      );
    });
  }
}
