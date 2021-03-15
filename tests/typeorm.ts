import { getConnection, getRepository, ObjectLiteral } from "typeorm";
import { request, gql } from "graphql-request";
import { connect, listen } from "../examples/typeorm";
import typeormResolvers from "../examples/typeorm/resolvers";
import { Company } from "../examples/typeorm/entities/Company";
import { Desk } from "../examples/typeorm/entities/Desk";
import { Chair } from "../examples/typeorm/entities/Chair";
import { Cert } from "../examples/typeorm/entities/Cert";
import { Employee } from "../examples/typeorm/entities/Employee";

let close: () => Promise<void>;
let endpoint: string;

const seed = async () => {
  const [company, company2] = await Promise.all(
    [{ name: "company1" }, { name: "company2" }].map((v) =>
      getRepository(Company, "test").save(new Company(v))
    )
  );

  const [desk1, desk2, desk3] = await Promise.all(
    [
      { name: "desk1", company },
      { name: "desk2", company },
      { name: "desk3", company },
    ].map((v) => getRepository(Desk, "test").save(new Desk(v)))
  );

  const [chair1] = await Promise.all(
    [
      { name: "chair1", company, desk: desk1 },
      { name: "chair2", company: company2 },
    ].map((v) => getRepository(Chair, "test").save(new Chair(v)))
  );

  const [cert1, cert2, cert3] = await Promise.all(
    [{ name: "cert1" }, { name: "cert2" }, { name: "cert3" }].map((v) =>
      getRepository(Cert, "test").save(new Cert(v))
    )
  );

  const [employee1, employee2, employee3] = await Promise.all(
    [
      { name: "employee1", company, desk: desk1, certs: [cert1, cert2] },
      { name: "employee2", company, desk: desk2, certs: [cert1] },
      { name: "employee3", company, certs: [] },
    ].map((v) => getRepository(Employee, "test").save(new Employee(v)))
  );
};

beforeAll(async () => {
  await connect();
  await seed();
  const { port, close: _close } = await listen(0, typeormResolvers);
  close = _close;
  endpoint = `http://localhost:${port}/graphql`;
});

afterAll(async () => {
  await close();
  await getConnection("test").close();
});

const objectTypes = {
  Company,
  Employee,
  Desk,
  Chair,
  Cert,
};

type typename = "Company" | "Employee" | "Desk" | "Chair" | "Cert";

const coalesceTypenames = (objects: ObjectLiteral[]): typename => {
  const typename = objects
    .map((a) => a.__typename)
    .reduce((a, b) => (a === b ? a : null));
  if (typename == null) {
    throw Error("typename mismatch");
  }
  return typename;
};

const verify = async <Entity extends ObjectLiteral>(
  objectOrObjects: ObjectLiteral | ObjectLiteral[],
  entityOrEntities: Entity | Entity[]
) => {
  if (Array.isArray(objectOrObjects)) {
    if (!Array.isArray(entityOrEntities)) {
      throw Error("entityOrEntities type mismatch");
    }
    const entities = entityOrEntities;

    const objects = objectOrObjects;
    expect(objects.length).toEqual(entities.length);
    if (objects.length === 0) {
      return;
    }
    coalesceTypenames(objects);

    await Promise.all(
      objects.map((object) => {
        const entity = entities.find((entity) => entity.name === object.name);
        if (entity == null) {
          throw Error("Corresponding entity was not found");
        }
        return verify(object, entity);
      })
    );
  } else {
    if (Array.isArray(entityOrEntities)) {
      throw Error("entityOrEntities type mismatch");
    }
    const obj = objectOrObjects;
    const entity = entityOrEntities;
    expect(obj.name).toEqual(entity.name);

    await Promise.all(
      Object.keys(obj).map(async (k) => {
        const nextObj = obj[k];
        const getSelfEntity = async () =>
          (await getRepository(
            objectTypes[obj.__typename as typename]
          , "test").findOneOrFail({
            where: { name: obj.name },
            relations: [k],
          })) as any;

        if (Array.isArray(nextObj)) {
          // ToMany field
          const nextEntities = await (await getSelfEntity())[k];
          return verify(nextObj, nextEntities);
        } else {
          // ToOne field (null)
          if (nextObj == null) {
            expect(await (await getSelfEntity())[k]).toBeNull();
            return;
          }
          // Column field
          const typename = nextObj.__typename as typename;
          if (typename == null) {
            return;
          }
          // ToOne field
          const nextEntity = await (await getSelfEntity())[k];
          return verify(nextObj, nextEntity);
        }
      })
    );
  }
};

test("verify query companies", async () => {
  const query = gql`
    query {
      companies {
        __typename
        name
        employees {
          __typename
          name
          company {
            __typename
            name
            employees {
              __typename
              name
            }
          }
        }
        desks {
          __typename
          name
          company {
            __typename
            name
          }
        }
        chairs {
          __typename
          name
          company {
            __typename
            name
            chairs {
              __typename
              name
            }
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(data.companies, await getRepository(Company, "test").find());
});

test("verify query employees", async () => {
  const query = gql`
    query {
      employees {
        __typename
        name
        company {
          __typename
          name
        }
        desk {
          __typename
          name
          employee {
            __typename
            name
          }
        }
        certs {
          __typename
          name
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(data.employees, await getRepository(Employee, "test").find());
});

test("verify query certs", async () => {
  const query = gql`
    query {
      certs {
        __typename
        name
        employees {
          __typename
          name
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(data.certs, await getRepository(Cert, "test").find());
});

test("verify query desks", async () => {
  const query = gql`
    query {
      desks {
        __typename
        name
        company {
          __typename
          name
        }
        employee {
          __typename
          name
        }
        chair {
          __typename
          name
          company {
            __typename
            name
          }
          desk {
            __typename
            name
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(data.desks, await getRepository(Desk, "test").find());
});
