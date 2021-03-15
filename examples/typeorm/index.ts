import path from "path";
import http from "http";
import { promisify } from "util";
import { buildSchema, NonEmptyArray } from "type-graphql";
import { createConnection, getRepository, getConnection } from "typeorm";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { Chair } from "./entities/Chair";
import { Desk } from "./entities/Desk";
import { Company } from "./entities/Company";
import { Employee } from "./entities/Employee";
import typeormResolvers from "./resolvers";
import { ApolloServerLoaderPlugin } from "#/.";
import { Cert } from "./entities/Cert";
import { AddressInfo } from "net";

export function connect(logging: boolean = false) {
  return createConnection({
    name: "test",
    type: "sqlite",
    database: ":memory:",
    entities: [path.resolve(__dirname, "entities", "*.{js,ts}")],
    synchronize: true,
    logging,
  });
}

export async function seed() {
  const company = await getRepository(Company, 'test').save(new Company({}));

  const desk1 = await getRepository(Desk, 'test').save(new Desk({ company }));
  const desk2 = await getRepository(Desk, 'test').save(new Desk({ company }));

  const chair1 = await getRepository(Chair, 'test').save(
    new Chair({ company, desk: desk1 })
  );

  const cert1 = await getRepository(Cert, 'test').save(new Cert({}));
  const cert2 = await getRepository(Cert, 'test').save(new Cert({}));

  const employee1 = await getRepository(Employee, 'test').save(
    new Employee({ company, desk: desk1, certs: [cert1, cert2] })
  );
  const employee2 = await getRepository(Employee, 'test').save(
    new Employee({ company, certs: [cert1] })
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
    context: ({ req, res }: any) => ({
      req,
      res,
      typeormConnectionName: 'test',
    })
  });

  apollo.applyMiddleware({ app, cors: false });

  const server = http.createServer(app);
  await promisify(server.listen).apply(server, [port] as any);

  return {
    port: (server.address() as AddressInfo).port,
    close: promisify(server.close).bind(server),
  };
}

if (require.main === module) {
  (async () => {
    await connect();
    await seed();
    const { port } = await listen(3001, typeormResolvers);
    console.log(`Listening on port ${port}`);
  })();
}
