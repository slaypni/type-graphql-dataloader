import { Resolver, Query } from "type-graphql";
import { getRepository } from "typeorm";
import { Desk } from "../entities/Desk";

@Resolver((of) => Desk)
export default class DeskResolver {
  @Query((returns) => [Desk])
  async desks(): Promise<Desk[]> {
    return getRepository(Desk).find();
  }
}
