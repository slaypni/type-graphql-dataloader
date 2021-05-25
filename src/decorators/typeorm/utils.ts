import { Brackets, Connection } from "typeorm";
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

export async function getToOneMap<V>(
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
      const r = Object.entries(relation)
        .filter(([k, _]) => keyColumns.includes(k))
        .map(([_, v]) => v);
      m.set(r.toString(), entity);
    }
  }
  return m;
}

export async function getToManyMap<V>(
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
      const r = Object.entries(relation)
        .filter(([k, _]) => keyColumns.includes(k))
        .map(([_, v]) => v);
      const key = r.toString();
      if (m.has(key)) {
        m.get(key)!.push(entity);
      } else {
        m.set(key, [entity]);
      }
    }
  }
  return m;
}
