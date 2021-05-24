import { Dictionary, groupBy, keyBy } from "lodash";
import type { Connection } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

function getFetchColumns<V>(
  relation: RelationMetadata,
  connection: Connection,
  relatedColumns: string[]
): string[] {
  const columns = connection
    .getMetadata(relation.type)
    .columns.map((c) => `${relation.propertyName}.${c.propertyAliasName}`);
  columns.push(...relatedColumns);
  return columns;
}

export async function query(
  relation: RelationMetadata,
  connection: Connection,
  primaryKeys: readonly any[][],
  relationName: string,
  columnMeta: ColumnMetadata[]
): Promise<object[]> {
  const qb = connection.createQueryBuilder(
    relation.type,
    relation.propertyName
  );

  const columns = columnMeta.map(
    (c) => `${relationName}.${c.propertyAliasName}`
  );
  if (relation.isOneToOneOwner || relation.isManyToOne) {
    qb.select(getFetchColumns(relation, connection, columns));
    qb.leftJoin(`${relation.propertyName}.${relationName}`, relationName);
  } else if (relation.isManyToMany) {
    const inversePropName = relation.inverseRelation!.propertyName;
    qb.select(getFetchColumns(relation, connection, columns));
    qb.leftJoin(`${relation.propertyName}.${inversePropName}`, inversePropName);
  }

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
      const conditions: string[] = [];
      for (let j = 0; j < columns.length; j++) {
        const key = `${i}_${keys[j]}`;
        conditions.push(`${columns[j]} = :${key}`);
        qb.setParameter(key, pk[j]);
      }
      qb.orWhere(`(${conditions.join(" AND ")})`);
    }
  }

  return qb.getRawMany();
}

function createEntity<V>(entityType: new () => V, joinedPrefix?: string) {
  return (rawResult: object) => {
    if (rawResult == null) {
      return;
    }

    const data: { [key: string]: any } = {};
    Object.entries(rawResult).forEach(([key, value]) => {
      if (!key.includes("_")) {
        return;
      }
      const [prefix] = key.split("_", 1);
      if (prefix !== joinedPrefix) {
        data[key.replace(`${prefix}_`, "")] = value;
      }
    });
    return Object.assign(new entityType(), data);
  };
}

export function getToOneLoadData<V>(
  ids: readonly { toString: () => string }[][],
  rawResults: object[],
  groupColumns: string[],
  entityType: new () => V,
  relationName?: string
): any[] {
  const groups = keyBy(rawResults, (value: object) =>
    Object.entries(value)
      .filter(([k, _]) => groupColumns.includes(k))
      .map(([_, v]) => v)
  ) as Dictionary<object>;

  return ids.map((pk) =>
    createEntity<V>(entityType, relationName)(groups[pk.toString()])
  );
}

export function getToManyLoadData<V>(
  ids: readonly { toString: () => string }[],
  rawReulsts: object[],
  groupColumns: string[],
  entityType: new () => V,
  relationName?: string
): any[][] {
  const groups = groupBy(rawReulsts, (value: object) => {
    return Object.entries(value)
      .filter(([k, _]) => groupColumns.includes(k))
      .map(([_, v]) => v);
  }) as Dictionary<object[]>;

  return ids.map((pk) => {
    const group = groups[pk.toString()];
    if (group == null) {
      return [];
    }
    return group.map(createEntity<V>(entityType, relationName)) ?? [];
  });
}
