import { Dictionary, groupBy, keyBy } from "lodash";
import type { Connection } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

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
      const [prefix, column] = key.split("_");
      if (prefix !== joinedPrefix) {
        data[column] = value;
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
