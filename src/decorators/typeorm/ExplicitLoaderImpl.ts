import { TgdContext } from "#/types/TgdContext";
import DataLoader from "dataloader";
import { Dictionary, groupBy, keyBy } from "lodash";
import { UseMiddleware } from "type-graphql";
import Container from "typedi";
import type { Connection } from "typeorm";
import type { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import type { RelationMetadata } from "typeorm/metadata/RelationMetadata";
import { TypeormLoaderOption } from "./TypeormLoader";

type KeyFunc = (root: any) => any | any[] | undefined;

export function ExplicitLoaderImpl<V>(
  keyFunc: KeyFunc,
  option?: TypeormLoaderOption
): PropertyDecorator {
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
      if (
        option?.selfKey &&
        !(relation.isOneToMany || relation.isOneToOneNotOwner)
      ) {
        throw Error(
          "selfKey option is available only for OneToMany or OneToOneNotOwner"
        );
      }

      // prettier-ignore
      const handle =
        relation.isManyToOne || relation.isOneToOneOwner ?
          handleToOne :
        relation.isOneToMany ?
          option?.selfKey ?
            handleOneToManyWithSelfKey :
          handleToMany :
        relation.isOneToOneNotOwner ?
          option?.selfKey ?
            handleOneToOneNotOwnerWithSelfKey :
          handleToOne :
        relation.isManyToMany ?
          handleToMany :
        () => next();
      return await handle<V>(keyFunc, root, tgdContext, relation);
    })(target, propertyKey);
  };
}

async function handler<V>(
  { requestId, typeormGetConnection }: TgdContext,
  relation: RelationMetadata,
  columns: ColumnMetadata[],
  newDataloader: (connection: Connection) => DataLoader<any, V>,
  callback: (
    dataloader: DataLoader<any, V>,
    columns: ColumnMetadata[]
  ) => Promise<any>
) {
  if (typeormGetConnection == null) {
    throw Error("Connection is not available");
  }

  if (columns.length !== 1) {
    throw Error("Loading by multiple columns as foreign key is not supported.");
  }

  const serviceId = `tgd-typeorm#${relation.entityMetadata.tableName}#${relation.propertyName}`;
  const container = Container.of(requestId);
  if (!container.has(serviceId)) {
    container.set(serviceId, newDataloader(typeormGetConnection()));
  }

  return callback(container.get<DataLoader<any, any>>(serviceId), columns);
}

async function handleToMany<V>(
  foreignKeyFunc: (root: any) => any | undefined,
  root: any,
  tgdContext: TgdContext,
  relation: RelationMetadata
) {
  return handler(
    tgdContext,
    relation,
    relation.inverseEntityMetadata.primaryColumns,
    (connection) => new ToManyDataloader<V>(relation, connection),
    async (dataloader) => {
      const fks = foreignKeyFunc(root);
      return await dataloader.loadMany(fks);
    }
  );
}

async function handleToOne<V>(
  foreignKeyFunc: (root: any) => any | undefined,
  root: any,
  tgdContext: TgdContext,
  relation: RelationMetadata
) {
  return handler(
    tgdContext,
    relation,
    relation.inverseEntityMetadata.primaryColumns,
    (connection) => new ToOneDataloader<V>(relation, connection),
    async (dataloader) => {
      const fk = foreignKeyFunc(root);
      return fk != null ? await dataloader.load(fk) : null;
    }
  );
}
async function handleOneToManyWithSelfKey<V>(
  selfKeyFunc: (root: any) => any | any[],
  root: any,
  tgdContext: TgdContext,
  relation: RelationMetadata
) {
  return handler(
    tgdContext,
    relation,
    relation.entityMetadata.primaryColumns,
    (connection) => new SelfKeyDataloader<V>(relation, connection, selfKeyFunc),
    async (dataloader, columns) => {
      const pk = columns[0].getEntityValue(root);
      return await dataloader.load(pk);
    }
  );
}

async function handleOneToOneNotOwnerWithSelfKey<V>(
  selfKeyFunc: (root: any) => any | undefined,
  root: any,
  tgdContext: TgdContext,
  relation: RelationMetadata
) {
  return handler(
    tgdContext,
    relation,
    relation.entityMetadata.primaryColumns,
    (connection) => new SelfKeyDataloader<V>(relation, connection, selfKeyFunc),
    async (dataloader, columns) => {
      const pk = columns[0].getEntityValue(root);
      return (await dataloader.load(pk))[0] ?? null;
    }
  );
}
function directLoader<V>(
  relation: RelationMetadata,
  connection: Connection,
  grouper: string | ((entity: V) => any)
) {
  return async (ids: readonly any[]) => {
    const entities = keyBy(
      await connection
        .createQueryBuilder<V>(relation.type, relation.propertyName)
        .whereInIds(ids)
        .getMany(),
      grouper
    ) as Dictionary<V>;
    return ids.map((id) => entities[id]);
  };
}

class ToManyDataloader<V> extends DataLoader<any, V> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(
      directLoader(relation, connection, (entity) =>
        relation.inverseEntityMetadata.primaryColumns[0].getEntityValue(entity)
      )
    );
  }
}

class ToOneDataloader<V> extends DataLoader<any, V> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(
      directLoader(
        relation,
        connection,
        relation.inverseEntityMetadata.primaryColumns[0].propertyName
      )
    );
  }
}

class SelfKeyDataloader<V> extends DataLoader<any, V[]> {
  constructor(
    relation: RelationMetadata,
    connection: Connection,
    selfKeyFunc: (root: any) => any
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
        selfKeyFunc
      );
      return ids.map((id) => entities[id] ?? []);
    });
  }
}
