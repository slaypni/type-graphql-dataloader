import { Dictionary, groupBy, keyBy } from "lodash";
import type { Connection } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

export async function query<V>(
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
    qb.leftJoinAndSelect(
      `${relation.propertyName}.${relationName}`,
      relationName
    );
  } else if (relation.isManyToMany) {
    const inversePropName = relation.inverseRelation!.propertyName;
    qb.leftJoinAndSelect(
      `${relation.propertyName}.${inversePropName}`,
      inversePropName
    );
  }
  const columns = columnMeta.map(
    (c) => `${relationName}.${c.propertyAliasName}`
  );
  const keys = columnMeta.map((c) => `${relationName}_${c.propertyAliasName}`);
  for (let i = 0; i < columns.length; i++) {
    qb.andWhere(`${columns[i]} IN (:...${keys[i]})`);
    qb.setParameter(
      keys[i],
      primaryKeys.map((k) => k[i])
    );
  }
  return qb.getRawMany();
}

function removePrefixAndJoinedData(joinedPrefix?: string): any {
  return (entity: any) => {
    if (entity == null) {
      return;
    }
    Object.keys(entity).map((key) => {
      if (!key.includes("_")) {
        return;
      }
      const [prefix, column] = key.split("_");
      if (prefix !== joinedPrefix) {
        entity[column] = entity[key];
      }
      delete entity[key];
    });
    return entity;
  };
}

export function getToOneLoadData<V>(
  ids: readonly any[][],
  entities: V[],
  groupColumns: string[],
  relationName?: string
): any[] {
  const groups = keyBy(entities, (value: V) =>
    Object.entries(value)
      .filter(([k, _]) => groupColumns.includes(k))
      .map(([_, v]) => v)
  ) as Dictionary<V>;

  return ids.map((pk) =>
    removePrefixAndJoinedData(relationName)(groups[pk.toString()])
  );
}

export function getToManyLoadData<V>(
  ids: readonly any[],
  entities: V[],
  groupColumns: string[],
  relationName?: string
): any[][] {
  const groups = groupBy(entities, (value: V) => {
    return Object.entries(value)
      .filter(([k, _]) => groupColumns.includes(k))
      .map(([_, v]) => v);
  }) as Dictionary<V[]>;

  return ids.map((pk) => {
    const group = groups[pk.toString()];
    if (group == null) {
      return [];
    }
    return group.map(removePrefixAndJoinedData(relationName)) ?? [];
  });
}
