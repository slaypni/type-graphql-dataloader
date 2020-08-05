import path from "path";
import http from "http";
import { promisify } from "util";
import { buildSchema, NonEmptyArray } from "type-graphql";
import { createConnection, getManager, getRepository } from "typeorm";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { Chair } from "./entities/Chair";
import { Desk } from "./entities/Desk";
import { Company } from "./entities/Company";
import { Employee } from "./entities/Employee";
import typeormResolvers from "./resolvers";
import { ApolloServerPlugin } from "#/.";
import { Cert } from "./entities/Cert";

export function connect() {
  return createConnection({
    type: "sqlite",
    database: ":memory:",
    entities: [path.resolve(__dirname, "entities", "*.{js,ts}")],
    synchronize: true,
    logging: true,
  });
}

export async function seed() {
  const company = await getRepository(Company).save(new Company({}));

  const desk1 = await getRepository(Desk).save(new Desk({ company }));
  const desk2 = await getRepository(Desk).save(new Desk({ company }));

  const chair1 = await getRepository(Chair).save(
    new Chair({ company, desk: desk1 })
  );

  const cert1 = await getRepository(Cert).save(new Cert({}));
  const cert2 = await getRepository(Cert).save(new Cert({}));

  const employee1 = await getRepository(Employee).save(
    new Employee({ company, desk: desk1, certs: [cert1, cert2] })
  );
  const employee2 = await getRepository(Employee).save(
    new Employee({ company, certs: [cert1] })
  );
}

export async function listen(
  port: number,
  resolvers: NonEmptyArray<Function>
): Promise<Function> {
  const app = express();

  const schema = await buildSchema({
    resolvers,
  });

  const apollo = new ApolloServer({ schema, plugins: [ApolloServerPlugin()] });

  apollo.applyMiddleware({ app, cors: false });

  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`Listening on port ${port}`);
    app.emit("started");
  });

  return promisify(server.close).bind(server);
}

if (require.main === module) {
  (async () => {
    await connect();
    await seed();
    listen(3000, typeormResolvers);
  })();
}
