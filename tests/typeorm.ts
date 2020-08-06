import { promisify } from "util";
import { getConnection } from "typeorm";
import { connect, listen } from "../examples/typeorm";
import typeormResolvers from "../examples/typeorm/resolvers";

let port: number;
let close: () => Promise<void>;

beforeAll(async () => {
  await connect();
  const { port: _port, close: _close } = await listen(0, typeormResolvers);
  [port, close] = [_port, _close];
});

afterAll(async () => {
  await close();
  await getConnection().close();
});

test("test", async () => {
  console.log("test");
});
