import { gql, request } from "graphql-request";
import { getConnection, getRepository, ObjectLiteral } from "typeorm";
import { connect, listen } from "../examples/typeorm";
import { ApplicationSoftware } from "../examples/typeorm/entities/ApplicationSoftware";
import { Cert } from "../examples/typeorm/entities/Cert";
import { Chair } from "../examples/typeorm/entities/Chair";
import { Company } from "../examples/typeorm/entities/Company";
import { Desk } from "../examples/typeorm/entities/Desk";
import { Employee } from "../examples/typeorm/entities/Employee";
import { PersonalComputer } from "../examples/typeorm/entities/PersonalComputer";
import typeormResolvers from "../examples/typeorm/resolvers";

let close: () => Promise<void>;
let endpoint: string;

const seed = async () => {
  const [company1, company2, company3] = await Promise.all(
    [{ name: "company1" }, { name: "company2" }, { name: "company3" }].map(
      (v) => getRepository(Company).save(new Company(v))
    )
  );

  const [desk1, desk2, desk3, desk4] = await Promise.all(
    [
      { name: "desk1", company: company1 },
      { name: "desk2", company: company1 },
      { name: "desk3", company: company1 },
      { name: "desk4", company: company2 },
    ].map((v) => getRepository(Desk).save(new Desk(v)))
  );

  const [chair1, chair2] = await Promise.all(
    [
      { name: "chair1", company: company1, desk: desk1 },
      { name: "chair2", company: company2 },
    ].map((v) => getRepository(Chair).save(new Chair(v)))
  );

  const [cert1, cert2, cert3] = await Promise.all(
    [{ name: "cert1" }, { name: "cert2" }, { name: "cert3" }].map((v) =>
      getRepository(Cert).save(new Cert(v))
    )
  );

  const [employee1, employee2, employee3] = await Promise.all(
    [
      {
        name: "employee1",
        company: company1,
        desk: desk1,
        certs: [cert1, cert2],
      },
      { name: "employee2", company: company1, desk: desk2, certs: [cert1] },
      { name: "employee3", company: company1, certs: [] },
    ].map((v) => getRepository(Employee).save(new Employee(v)))
  );

  const [app1, app2, app3] = await Promise.all(
    [
      { name: "app1", majorVersion: 1, minorVersion: 0, publishedBy: company1 },
      { name: "app2", majorVersion: 2, minorVersion: 0 },
      { name: "app3", majorVersion: 3, minorVersion: 1, publishedBy: company3 },
    ].map((v) =>
      getRepository(ApplicationSoftware).save(new ApplicationSoftware(v))
    )
  );

  const [pc1, pc2, pc3, pc4] = await Promise.all(
    [
      {
        name: "pc1",
        propertyOf: company1,
        placedAt: desk1,
        installedApps: [app1],
      },
      {
        name: "pc2",
        propertyOf: company1,
        placedAt: desk2,
        installedApps: [],
      },
      { name: "pc3", propertyOf: company1, installedApps: [app1, app2] },
      {
        name: "pc4",
        propertyOf: company2,
        placedAt: desk4,
        installedApps: [app2, app3],
      },
    ].map((v) => getRepository(PersonalComputer).save(new PersonalComputer(v)))
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
  await getConnection().close();
});

const objectTypes = {
  Company,
  Employee,
  Desk,
  Chair,
  Cert,
  ApplicationSoftware,
  PersonalComputer,
};

type typename =
  | "Company"
  | "Employee"
  | "Desk"
  | "Chair"
  | "Cert"
  | "ApplicationSoftware"
  | "PersonalComputer";

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
          ).findOneOrFail({
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
        publishedApps {
          __typename
          name
          publishedBy {
            __typename
            name
          }
          installedComputers {
            __typename
            name
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(data.companies, await getRepository(Company).find());
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
          publishedApps {
            __typename
            name
          }
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
  await verify(data.employees, await getRepository(Employee).find());
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
  await verify(data.certs, await getRepository(Cert).find());
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
            desktopComputer {
              __typename
              name
            }
          }
        }
        desktopComputer {
          __typename
          name
          placedAt {
            __typename
            name
          }
          installedApps {
            __typename
            name
            installedComputers {
              __typename
              name
            }
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(data.desks, await getRepository(Desk).find());
});
