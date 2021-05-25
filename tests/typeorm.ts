import { gql, request } from "graphql-request";
import { getConnection, getRepository, ObjectLiteral } from "typeorm";
import { connect, listen } from "../examples/typeorm";
import { Cert } from "../examples/typeorm/entities/Cert";
import { Chair } from "../examples/typeorm/entities/Chair";
import { Company } from "../examples/typeorm/entities/Company";
import { CompositeDevice } from "../examples/typeorm/entities/CompositeDevice";
import { CompositeLaptop } from "../examples/typeorm/entities/CompositeLaptop";
import { CompositeOperatingSystem } from "../examples/typeorm/entities/CompositeOperatingSystem";
import { Desk } from "../examples/typeorm/entities/Desk";
import { Device } from "../examples/typeorm/entities/Device";
import { Employee } from "../examples/typeorm/entities/Employee";
import { Laptop } from "../examples/typeorm/entities/Laptop";
import { OperatingSystem } from "../examples/typeorm/entities/OperatingSystem";
import typeormResolvers from "../examples/typeorm/resolvers";

let close: () => Promise<void>;
let endpoint: string;

async function createCompositeData() {
  const [inkjetPrinter, lasorPrinter, permanentMonitor, mobileMonitor] =
    await Promise.all(
      [
        { type: "printer", did: 1, name: "inkjet printer" },
        { type: "printer", did: 2, name: "lasor printer" },
        { type: "monitor", did: 1, name: "permanent monitor" },
        { type: "monitor", did: 2, name: "mobile monitor" },
      ].map((v) => getRepository(CompositeDevice).save(new CompositeDevice(v)))
    );

  const [imac, macmini, thinkpad, chromebook, xps, vostro] = await Promise.all(
    [
      {
        vendor: "apple",
        id: 1,
        name: "imac",
        devices: [inkjetPrinter, permanentMonitor],
      },
      {
        vendor: "apple",
        id: 2,
        name: "macmini",
      },
      {
        vendor: "lenovo",
        id: 1,
        name: "thinkpad",
        devices: [inkjetPrinter, mobileMonitor],
      },
      {
        vendor: "lenovo",
        id: 2,
        name: "chromebook",
        devices: [lasorPrinter, mobileMonitor],
      },
      {
        vendor: "dell",
        id: 1,
        name: "xps",
        devices: [lasorPrinter, permanentMonitor],
      },
      {
        vendor: "dell",
        id: 2,
        name: "vostro",
        devices: [inkjetPrinter, permanentMonitor],
      },
    ].map((v) => getRepository(CompositeLaptop).save(new CompositeLaptop(v)))
  );

  await Promise.all(
    [
      {
        type: "linux",
        id: 1,
        name: "fedora",
        laptop: thinkpad,
      },
      {
        type: "linux",
        id: 2,
        name: "ubuntu",
        laptop: chromebook,
      },
      {
        type: "bsd",
        id: 1,
        name: "macos catalina",
        laptop: imac,
      },
      {
        type: "bsd",
        id: 2,
        name: "macos big sur",
        laptop: chromebook,
      },
      {
        type: "windows",
        id: 1,
        name: "windows 7",
        laptop: thinkpad,
      },
      {
        type: "windows",
        id: 2,
        name: "windows 8",
        laptop: chromebook,
      },
      {
        type: "windows",
        id: 3,
        name: "windows 8.1",
        laptop: xps,
      },
      {
        type: "windows",
        id: 4,
        name: "windows 10",
        laptop: vostro,
      },
    ].map((v) =>
      getRepository(CompositeOperatingSystem).save(
        new CompositeOperatingSystem(v)
      )
    )
  );

  return [macmini, imac, chromebook];
}

const seed = async () => {
  const [company, company2] = await Promise.all(
    [{ name: "company1" }, { name: "company2" }].map((v) =>
      getRepository(Company).save(new Company(v))
    )
  );

  const [desk1, desk2, desk3] = await Promise.all(
    [
      { name: "desk1", company },
      { name: "desk2", company },
      { name: "desk3", company },
    ].map((v) => getRepository(Desk).save(new Desk(v)))
  );

  const [chair1] = await Promise.all(
    [
      { name: "chair1", company, desk: desk1 },
      { name: "chair2", company: company2 },
    ].map((v) => getRepository(Chair).save(new Chair(v)))
  );

  const [cert1, cert2, cert3] = await Promise.all(
    [{ name: "cert1" }, { name: "cert2" }, { name: "cert3" }].map((v) =>
      getRepository(Cert).save(new Cert(v))
    )
  );

  const [printer, monitor] = await Promise.all(
    [{ name: "printer" }, { name: "monitor" }].map((v) =>
      getRepository(Device).save(new Device(v))
    )
  );

  const [macbook, thinkpad, xps] = await Promise.all(
    [
      { name: "macbook", devices: [printer, monitor] },
      { name: "thinkpad", devices: [printer, monitor] },
      { name: "xps", devices: [printer, monitor] },
    ].map((v) => getRepository(Laptop).save(new Laptop(v)))
  );

  const [fedora, ubuntu, macosCatalina, macosBigSur, windows81, windows10] =
    await Promise.all(
      [
        { name: "fedora", laptop: thinkpad },
        { name: "ubuntu", laptop: xps },
        { name: "macos catalina", laptop: macbook },
        { name: "macos big sur", laptop: xps },
        { name: "windows 8.1", laptop: thinkpad },
        { name: "windows 10", laptop: xps },
      ].map((v) => getRepository(OperatingSystem).save(new OperatingSystem(v)))
    );

  const [macmini, imac, chromebook] = await createCompositeData();

  const [employee1, employee2, employee3] = await Promise.all(
    [
      {
        name: "employee1",
        company,
        desk: desk1,
        certs: [cert1, cert2],
        laptop: macbook,
        compositeLaptop: macmini,
      },
      {
        name: "employee2",
        company,
        desk: desk2,
        certs: [cert1],
        laptop: thinkpad,
        compositeLaptop: imac,
      },
      {
        name: "employee3",
        company,
        certs: [],
        laptop: xps,
        compositeLaptop: chromebook,
      },
    ].map((v) => getRepository(Employee).save(new Employee(v)))
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
  Laptop,
  OperatingSystem,
  Device,
  CompositeLaptop,
  CompositeOperatingSystem,
  CompositeDevice,
};

type typename =
  | "Company"
  | "Employee"
  | "Desk"
  | "Chair"
  | "Cert"
  | "Laptop"
  | "OperatingSystem"
  | "Device"
  | "CompositeLaptop"
  | "CompositeOperatingSystem"
  | "CompositeDevice";

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
          // Array column field
          if (typeof nextObj[0] === "number" || typeof nextObj[0] === "string") {
            expect(nextObj).toEqual(entity[k]);
            return;
          }
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
        laptop {
          __typename
          name
          yaname
        }
        compositeLaptop {
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
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(data.desks, await getRepository(Desk).find());
});

test("verify query laptops", async () => {
  const query = gql`
    query {
      laptops {
        __typename
        name
        deviceIds
        employee {
          __typename
          name
          laptop {
            __typename
            name
            yaname
            deviceIds
          }
        }
        operatingSystems {
          __typename
          oid
          name
          laptop {
            __typename
            name
            yaname
            deviceIds
          }
        }
        devices {
          __typename
          did
          name
          laptops {
            __typename
            name
            yaname
            deviceIds
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(data.laptops, await getRepository(Laptop).find());
});

test("verify query operating system", async () => {
  const query = gql`
    query {
      operatingSystems {
        __typename
        name
        laptop {
          __typename
          name
          yaname
          operatingSystems {
            __typename
            name
          }
          devices {
            __typename
            did
            name
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(
    data.operatingSystems,
    await getRepository(OperatingSystem).find()
  );
});

test("verify query devices", async () => {
  const query = gql`
    query {
      devices {
        __typename
        name
        laptops {
          __typename
          name
          yaname
          deviceIds
          devices {
            __typename
            did
            name
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(data.devices, await getRepository(Device).find());
});

test("verify query compositeLaptops", async () => {
  const query = gql`
    query {
      compositeLaptops {
        __typename
        vendor
        id
        name
        employee {
          __typename
          name
          compositeLaptop {
            __typename
            vendor
            id
            name
          }
        }
        operatingSystems {
          __typename
          type
          id
          name
          laptop {
            __typename
            vendor
            id
            name
          }
        }
        devices {
          __typename
          type
          did
          name
          laptops {
            __typename
            vendor
            id
            name
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(
    data.compositeLaptops,
    await getRepository(CompositeLaptop).find()
  );
});

test("verify query compositeOperatingSystems", async () => {
  const query = gql`
    query {
      compositeOperatingSystems {
        __typename
        type
        id
        name
        laptop {
          __typename
          vendor
          id
          name
          operatingSystems {
            __typename
            type
            id
            name
          }
          devices {
            __typename
            type
            did
            name
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(
    data.compositeOperatingSystems,
    await getRepository(CompositeOperatingSystem).find()
  );
});

test("verify query compositeDevices", async () => {
  const query = gql`
    query {
      compositeDevices {
        __typename
        type
        did
        name
        laptops {
          __typename
          vendor
          id
          name
          devices {
            __typename
            type
            did
            name
          }
        }
      }
    }
  `;
  const data = await request(endpoint, query);
  await verify(
    data.compositeDevices,
    await getRepository(CompositeDevice).find()
  );
});
