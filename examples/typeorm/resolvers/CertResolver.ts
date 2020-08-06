import { Resolver, Query } from "type-graphql";
import { getRepository } from "typeorm";
import { Cert } from "../entities/Cert";

@Resolver((of) => Cert)
export default class CertResolver {
  @Query((returns) => [Cert])
  async certs(): Promise<Cert[]> {
    return getRepository(Cert).find();
  }
}
