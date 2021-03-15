import { Resolver, Query, Ctx } from "type-graphql";
import { getRepository } from "typeorm";
import { Cert } from "../entities/Cert";

@Resolver((of) => Cert)
export default class CertResolver {
  @Query((returns) => [Cert])
  async certs(@Ctx() ctx: { typeormConnectionName: string; }): Promise<Cert[]> {
    return getRepository(Cert, ctx.typeormConnectionName).find();
  }
}
