import { Query, Resolver } from "type-graphql";
import { Cert } from "../entities/Cert";
import { getDataSource } from "../getDataSource";

@Resolver((of) => Cert)
export default class CertResolver {
  @Query((returns) => [Cert])
  async certs(): Promise<Cert[]> {
    return (await getDataSource()).getRepository(Cert).find();
  }
}
