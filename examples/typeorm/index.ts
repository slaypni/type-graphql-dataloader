import { ApolloServerLoaderPlugin } from "#/.";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import http from "http";
import { AddressInfo } from "net";
import path from "path";
import { buildSchema, NonEmptyArray } from "type-graphql";
import { createConnection, getConnection, getRepository } from "typeorm";
import { promisify } from "util";
import { Cert } from "./entities/Cert";
import { Chair } from "./entities/Chair";
import { Company } from "./entities/Company";
import { CompositeDevice } from "./entities/CompositeDevice";
import { CompositeLaptop } from "./entities/CompositeLaptop";
import { CompositeOperatingSystem } from "./entities/CompositeOperatingSystem";
import { Desk } from "./entities/Desk";
import { Device } from "./entities/Device";
import { Employee } from "./entities/Employee";
import { Laptop } from "./entities/Laptop";
import { OperatingSystem } from "./entities/OperatingSystem";
import typeormResolvers from "./resolvers";

export function connect(logging: boolean = false) {
  return createConnection({
    type: "sqlite",
    database: ":memory:",
    entities: [path.resolve(__dirname, "entities", "*.{js,ts}")],
    synchronize: true,
    logging,
  });
}

async function createCompositeData() {
  const inkjetPrinter = await getRepository(CompositeDevice).save(
    new CompositeDevice({ type: "printer", did: 1, name: "inkjet printer" })
  );
  const lasorPrinter = await getRepository(CompositeDevice).save(
    new CompositeDevice({ type: "printer", did: 2, name: "lasor printer" })
  );
  const permanentMonitor = await getRepository(CompositeDevice).save(
    new CompositeDevice({ type: "monitor", did: 1, name: "permanent monitor" })
  );
  const mobileMonitor = await getRepository(CompositeDevice).save(
    new CompositeDevice({ type: "monitor", did: 2, name: "mobile monitor" })
  );

  const compositeMacbook = await getRepository(CompositeLaptop).save(
    new CompositeLaptop({
      vendor: "apple",
      id: 1,
      name: "macbook",
      devices: [inkjetPrinter, permanentMonitor],
    })
  );
  const compositeMacmini = await getRepository(CompositeLaptop).save(
    new CompositeLaptop({
      vendor: "apple",
      id: 2,
      name: "macmini",
    })
  );
  const compositeThinkpad = await getRepository(CompositeLaptop).save(
    new CompositeLaptop({
      vendor: "lenovo",
      id: 1,
      name: "thinkpad",
      devices: [inkjetPrinter, mobileMonitor],
    })
  );
  const compositeChromebook = await getRepository(CompositeLaptop).save(
    new CompositeLaptop({
      vendor: "lenovo",
      id: 2,
      name: "chromebook",
      devices: [lasorPrinter, mobileMonitor],
    })
  );
  const compositeXps = await getRepository(CompositeLaptop).save(
    new CompositeLaptop({
      vendor: "dell",
      id: 1,
      name: "xps",
      devices: [lasorPrinter, permanentMonitor],
    })
  );
  const compositeVostro = await getRepository(CompositeLaptop).save(
    new CompositeLaptop({
      vendor: "dell",
      id: 2,
      name: "vostro",
      devices: [inkjetPrinter, permanentMonitor],
    })
  );

  await getRepository(CompositeOperatingSystem).save([
    new CompositeOperatingSystem({
      type: "linux",
      id: 1,
      name: "fedora",
      laptop: compositeThinkpad,
    }),
    new CompositeOperatingSystem({
      type: "linux",
      id: 2,
      name: "ubuntu",
      laptop: compositeChromebook,
    }),
    new CompositeOperatingSystem({
      type: "bsd",
      id: 1,
      name: "macos catalina",
      laptop: compositeMacbook,
    }),
    new CompositeOperatingSystem({
      type: "bsd",
      id: 2,
      name: "macos big sur",
      laptop: compositeChromebook,
    }),
    new CompositeOperatingSystem({
      type: "windows",
      id: 1,
      name: "windows 7",
      laptop: compositeThinkpad,
    }),
    new CompositeOperatingSystem({
      type: "windows",
      id: 2,
      name: "windows 8",
      laptop: compositeChromebook,
    }),
    new CompositeOperatingSystem({
      type: "windows",
      id: 3,
      name: "windows 8.1",
      laptop: compositeXps,
    }),
    new CompositeOperatingSystem({
      type: "windows",
      id: 4,
      name: "windows 10",
      laptop: compositeVostro,
    }),
  ]);

  return [compositeMacmini, compositeMacbook];
}

export async function seed() {
  const company = await getRepository(Company).save(new Company({}));

  const desk1 = await getRepository(Desk).save(new Desk({ company }));
  const desk2 = await getRepository(Desk).save(new Desk({ company }));

  const chair1 = await getRepository(Chair).save(
    new Chair({ company, desk: desk1 })
  );

  const printer = await getRepository(Device).save(
    new Device({ name: "printer" })
  );
  const monitor = await getRepository(Device).save(
    new Device({ name: "monitor" })
  );

  const macbook = await getRepository(Laptop).save(
    new Laptop({ name: "macbook", devices: [printer, monitor] })
  );
  const thinkpad = await getRepository(Laptop).save(
    new Laptop({ name: "thinkpad", devices: [printer, monitor] })
  );
  const xps = await getRepository(Laptop).save(
    new Laptop({ name: "xps", devices: [printer, monitor] })
  );

  await getRepository(OperatingSystem).save([
    new OperatingSystem({ name: "fedora", laptop: thinkpad }),
    new OperatingSystem({ name: "ubuntu", laptop: xps }),
    new OperatingSystem({ name: "macos catalina", laptop: macbook }),
    new OperatingSystem({ name: "macos big sur", laptop: xps }),
    new OperatingSystem({ name: "windows 8.1", laptop: thinkpad }),
    new OperatingSystem({ name: "windows 10", laptop: xps }),
  ]);

  const cert1 = await getRepository(Cert).save(new Cert({}));
  const cert2 = await getRepository(Cert).save(new Cert({}));

  const [compositeMacmini, compositeMacbook] = await createCompositeData();

  const employee1 = await getRepository(Employee).save(
    new Employee({
      company,
      name: "jack",
      desk: desk1,
      laptop: macbook,
      compositeLaptop: compositeMacmini,
      certs: [cert1, cert2],
    })
  );
  const employee2 = await getRepository(Employee).save(
    new Employee({
      company,
      name: "mary",
      laptop: xps,
      compositeLaptop: compositeMacbook,
      certs: [cert1],
    })
  );
}

interface ListenResult {
  port: number;
  close: () => Promise<void>;
}

export async function listen(
  port: number,
  resolvers: NonEmptyArray<Function>
): Promise<ListenResult> {
  const app = express();

  const schema = await buildSchema({
    resolvers,
  });

  const apollo = new ApolloServer({
    schema,
    plugins: [
      ApolloServerLoaderPlugin({
        typeormGetConnection: getConnection,
      }),
    ],
  });

  apollo.applyMiddleware({ app, cors: false });

  const server = http.createServer(app);
  await promisify(server.listen).apply(server, [port]);

  return {
    port: (server.address() as AddressInfo).port,
    close: promisify(server.close).bind(server),
  };
}

if (require.main === module) {
  (async () => {
    await connect();
    await seed();
    const { port } = await listen(3000, typeormResolvers);
    console.log(`Listening on port ${port}`);
  })();
}
