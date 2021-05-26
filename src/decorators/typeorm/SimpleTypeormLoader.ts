import { TgdContext } from "#/types/TgdContext";
import DataLoader from "dataloader";
import { UseMiddleware } from "type-graphql";
import Container from "typedi";
import type { Connection } from "typeorm";
import { Brackets } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

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
  dataloaderType: new (
    relation: RelationMetadata,
    connection: Connection
  ) => DataLoader<any[], V | V[]>
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

  const dataloader = container.get<DataLoader<any[], V | V[]>>(serviceId);
  const columns = relation.entityMetadata.primaryColumns;
  const pk = columns.map((c) => c.getEntityValue(root));
  return (await dataloader.load(pk)) ?? null;
}

class OneToOneOwnerDataloader<V> extends DataLoader<any[], V | V[]> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const relationName = relation.entityMetadata.tableName;
      const columns = relation.entityMetadata.primaryColumns;
      const entities = await query<V>(
        relation,
        connection,
        ids,
        relationName,
        columns
      );
      const relationKeys = columns.map((c) => c.propertyAliasName);
      const m = await getToOneMap<V>(entities, relationName, relationKeys);
      return ids.map((pk) => m.get(pk.toString())!);
    });
  }
}

class OnetoOneNotOwnerDataloader<V> extends DataLoader<any[], V | V[]> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const inverseRelation = relation.inverseRelation!;
      const relationName = relation.propertyName;
      const columns = inverseRelation.joinColumns;
      const entities = await query<V>(
        relation,
        connection,
        ids,
        relationName,
        columns
      );
      const relationKeys = columns.map(
        (c) => c.referencedColumn!.propertyAliasName
      );
      const m = await getToOneMap<V>(
        entities,
        inverseRelation.propertyName,
        relationKeys
      );
      return ids.map((pk) => m.get(pk.toString())!);
    });
  }
}

class ManyToOneDataloader<V> extends DataLoader<any[], V | V[]> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const relationName = relation.inverseRelation!.propertyName;
      const columns = relation.entityMetadata.primaryColumns;
      const entities = await query<V>(
        relation,
        connection,
        ids,
        relationName,
        columns
      );
      const relationKeys = columns.map((c) => c.propertyAliasName);
      const m = await getToOneMap<V>(entities, relationName, relationKeys);
      return ids.map((pk) => m.get(pk.toString())!);
    });
  }
}

class OneToManyDataloader<V> extends DataLoader<any[], V | V[]> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const inverseRelation = relation.inverseRelation!;
      const relationName = relation.propertyName;
      const columns = inverseRelation.joinColumns;
      const entities = await query<V>(
        relation,
        connection,
        ids,
        relationName,
        columns
      );
      const relationKeys = columns.map(
        (c) => c.referencedColumn!.propertyAliasName
      );
      const m = await getToManyMap<V>(
        entities,
        inverseRelation.propertyName,
        relationKeys
      );
      return ids.map((pk) => m.get(pk.toString()) ?? []);
    });
  }
}

class ManyToManyDataloader<V> extends DataLoader<any[], V | V[]> {
  constructor(relation: RelationMetadata, connection: Connection) {
    super(async (ids) => {
      const inversePropName = relation.inverseRelation!.propertyName;
      const relationName = `${relation.propertyName}_${inversePropName}`;
      const columns = relation.joinColumns;
      const entities = await query<V>(
        relation,
        connection,
        ids,
        relationName,
        columns
      );
      const relationKeys = columns.map(
        (c) => c.referencedColumn!.propertyAliasName
      );
      const m = await getToManyMap<V>(entities, inversePropName, relationKeys);
      return ids.map((pk) => m.get(pk.toString()) ?? []);
    });
  }
}

async function query<V>(
  relation: RelationMetadata,
  connection: Connection,
  primaryKeys: readonly any[][],
  relationName: string,
  columnMeta: ColumnMetadata[]
): Promise<V[]> {
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
  }

  const columns = columnMeta.map(
    (c) => `${relationName}.${c.propertyAliasName}`
  );
  const keys = columnMeta.map((c) => `${relationName}_${c.propertyAliasName}`);
  if (columnMeta.length === 1) {
    qb.where(`${columns[0]} IN (:...${keys[0]})`);
    qb.setParameter(
      keys[0],
      primaryKeys.map((pk) => pk[0])
    );
  } else {
    // for composite keys
    for (let i = 0; i < primaryKeys.length; i++) {
      const pk = primaryKeys[i];
      qb.orWhere(
        new Brackets((exp) => {
          for (let j = 0; j < columns.length; j++) {
            const key = `${i}_${keys[j]}`;
            exp.andWhere(`${columns[j]} = :${key}`, { [key]: pk[j] });
          }
        })
      );
    }
  }

  return qb.getMany();
}

async function getToOneMap<V>(
  entities: V[],
  field: string,
  keyColumns: string[]
): Promise<Map<string, V>> {
  const m: Map<string, V> = new Map();
  for (const entity of entities) {
    let relations = await (entity as any)[field];
    if (!Array.isArray(relations)) {
      relations = [relations];
    }
    for (const relation of relations) {
      const key = keyColumns.map((k) => relation[k]).toString();
      m.set(key, entity);
    }
  }
  return m;
}

async function getToManyMap<V>(
  entities: V[],
  field: string,
  keyColumns: string[]
): Promise<Map<string, V[]>> {
  const m: Map<string, V[]> = new Map();
  for (const entity of entities) {
    let relations = await (entity as any)[field];
    if (!Array.isArray(relations)) {
      relations = [relations];
    }
    for (const relation of relations) {
      const key = keyColumns.map((k) => relation[k]).toString();
      if (m.has(key)) {
        m.get(key)!.push(entity);
      } else {
        m.set(key, [entity]);
      }
    }
  }
  return m;
}