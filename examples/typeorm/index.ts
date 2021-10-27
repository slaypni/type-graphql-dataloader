import { ApolloServerLoaderPlugin } from "#/.";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import http from "http";
import { AddressInfo } from "net";
import path from "path";
import { buildSchema, NonEmptyArray } from "type-graphql";
import { createConnection, getConnection, getRepository } from "typeorm";
import { promisify } from "util";
import { ApplicationSoftware } from "./entities/ApplicationSoftware";
import { Cert } from "./entities/Cert";
import { Chair } from "./entities/Chair";
import { Company } from "./entities/Company";
import { Desk } from "./entities/Desk";
import { Employee } from "./entities/Employee";
import { PersonalComputer } from "./entities/PersonalComputer";
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

export async function seed() {
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
      { name: "app2", majorVersion: 2, minorVersion: 0, publishedBy: company1 },
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

  await apollo.start();
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
