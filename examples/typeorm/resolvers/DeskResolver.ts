import { Resolver, Query, Ctx } from "type-graphql";
import { getRepository } from "typeorm";
import { Desk } from "../entities/Desk";

@Resolver((of) => Desk)
export default class DeskResolver {
  @Query((returns) => [Desk])
  async desks(@Ctx() ctx: { typeormConnectionName: () => Promise<string>; }): Promise<Desk[]> {
    return getRepository(Desk, await ctx.typeormConnectionName()).find();
  }
}
