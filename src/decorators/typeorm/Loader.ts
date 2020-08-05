import { UseMiddleware } from "type-graphql";
import { ObjectType, getConnection, Connection } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";
import DataLoader from "dataloader";
import { keyBy, groupBy, Dictionary } from "lodash";
import Container from "typedi";
import { TgdContext } from "#/types/TgdContext";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";

export function Loader<V>(
  typeFunc: (type?: void) => ObjectType<V>,
  foreignKeyFunc: (root: any) => any | any[] | undefined
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    UseMiddleware(async ({ root, context }, next) => {
      const type = typeFunc();
      const tgdContext = context._tgdContext as TgdContext;
      tgdContext.typeormConnection =
        tgdContext.typeormConnection ?? getConnection();
      const relation = tgdContext.typeormConnection
        .getMetadata(target.constructor)
        .findRelationWithPropertyPath(propertyKey.toString());

      if (relation != null) {
        if (relation.isManyToOne || relation.isOneToOneOwner) {
          return await handleManyToOneOrOneToOneOwner<V>(
            foreignKeyFunc,
            root,
            tgdContext,
            relation
          );
        } else if (relation.isOneToMany) {
          return await handleOneToMany<V>(
            foreignKeyFunc,
            root,
            tgdContext,
            relation
          );
        } else if (relation.isOneToOneNotOwner) {
          return await handleOneToOneNotOwner<V>(
            foreignKeyFunc,
            root,
            tgdContext,
            relation
          );
        } else if (relation.isManyToMany) {
          return await handleManyToMany<V>(
            foreignKeyFunc,
            root,
            tgdContext,
            relation
          );
        }
      }
      return await next();
    })(target, propertyKey);
  };
}

async function handler<V>(
  { requestId, typeormConnection: connection }: TgdContext,
  relation: RelationMetadata,
  columns: ColumnMetadata[],
  newDataloader: (connection: Connection) => DataLoader<any, V>,
  callback: (
    dataloader: DataLoader<any, V>,
    columns: ColumnMetadata[]
  ) => Promise<any>
) {
  if (connection == null) {
    throw Error("Connection is not set");
  }

  if (columns.length !== 1) {
    throw Error("Loading by multiple columns as foreign key is not supported.");
  }

  const serviceId = `tgd#${relation.entityMetadata.tableName}#${relation.propertyName}`;
  const container = Container.of(requestId);
  if (!container.has(serviceId)) {
    container.set(serviceId, newDataloader(connection));
  }

  return callback(container.get<DataLoader<any, any>>(serviceId), columns);
}

class ManyToOneOrOneToOneOwnerDataloader<V> extends DataLoader<any, V> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const propName =
        relation.inverseEntityMetadata.primaryColumns[0].propertyName;
      const entities = keyBy(
        await connection
          .createQueryBuilder<V>(relation.type, relation.propertyName)
          .whereInIds(ids)
          .getMany(),
        propName
      );
      return ids.map((id) => entities[id]);
    });
  }
}

async function handleManyToOneOrOneToOneOwner<V>(
  foreignKeyFunc: (root: any) => any | undefined,
  root: any,
  tgdContext: TgdContext,
  relation: RelationMetadata
) {
  return handler(
    tgdContext,
    relation,
    relation.inverseEntityMetadata.primaryColumns,
    (connection) =>
      new ManyToOneOrOneToOneOwnerDataloader<V>(relation, connection),
    async (dataloader) => {
      const fk = foreignKeyFunc(root);
      return fk != null ? await dataloader.load(fk) : null;
    }
  );
}

class OneToManyOrOneToOneNotOwnerDataloader<V> extends DataLoader<any, V[]> {
  constructor(
    relation: RelationMetadata,
    connection: Connection,
    foreignKeyFunc: (root: any) => any
  ) {
    super(async (ids) => {
      const columns = relation.inverseRelation!.joinColumns;
      const k = `${relation.propertyName}_${columns[0].propertyName}`;
      const entities = groupBy(
        await connection
          .createQueryBuilder<V>(relation.type, relation.propertyName)
          .where(
            `${relation.propertyName}.${columns[0].propertyPath} IN (:...${k})`
          )
          .setParameter(k, ids)
          .getMany(),
        foreignKeyFunc
      );
      return ids.map((id) => entities[id] ?? []);
    });
  }
}

async function handleOneToMany<V>(
  foreignKeyFunc: (root: any) => any | any[],
  root: any,
  tgdContext: TgdContext,
  relation: RelationMetadata
) {
  return handler(
    tgdContext,
    relation,
    relation.entityMetadata.primaryColumns,
    (connection) =>
      new OneToManyOrOneToOneNotOwnerDataloader<V>(
        relation,
        connection,
        foreignKeyFunc
      ),
    async (dataloader, columns) => {
      const fk = columns[0].getEntityValue(root);
      return await dataloader.load(fk);
    }
  );
}

async function handleOneToOneNotOwner<V>(
  foreignKeyFunc: (root: any) => any | undefined,
  root: any,
  tgdContext: TgdContext,
  relation: RelationMetadata
) {
  return handler(
    tgdContext,
    relation,
    relation.entityMetadata.primaryColumns,
    (connection) =>
      new OneToManyOrOneToOneNotOwnerDataloader<V>(
        relation,
        connection,
        foreignKeyFunc
      ),
    async (dataloader, columns) => {
      const fk = columns[0].getEntityValue(root);
      return (await dataloader.load(fk))[0] ?? null;
    }
  );
}

class ManyToManyDataloader<V> extends DataLoader<any, V> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const columns = relation.inverseEntityMetadata.primaryColumns;
      const k = `${relation.propertyName}_${columns[0].propertyName}`;
      const entities = keyBy(
        await connection
          .createQueryBuilder<V>(relation.type, relation.propertyName)
          .where(
            `${relation.propertyName}.${columns[0].propertyPath} IN (:...${k})`
          )
          .setParameter(k, ids)
          .getMany(),
        (entity) => columns[0].getEntityValue(entity)
      ) as Dictionary<V>;
      return ids.map((id) => entities[id]);
    });
  }
}

async function handleManyToMany<V>(
  foreignKeyFunc: (root: any) => any | undefined,
  root: any,
  tgdContext: TgdContext,
  relation: RelationMetadata
) {
  return handler(
    tgdContext,
    relation,
    relation.inverseEntityMetadata.primaryColumns,
    (connection) => new ManyToManyDataloader<V>(relation, connection),
    async (dataloader) => {
      const fks = foreignKeyFunc(root);
      return await dataloader.loadMany(fks);
    }
  );
}
