import { Query, Resolver } from "type-graphql";
import { Desk } from "../entities/Desk";
import { getDataSource } from "../getDataSource";

@Resolver((of) => Desk)
export default class DeskResolver {
  @Query((returns) => [Desk])
  async desks(): Promise<Desk[]> {
    return (await getDataSource()).getRepository(Desk).find();
  }
}
