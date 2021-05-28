import { Query, Resolver } from "type-graphql";
import { getRepository } from "typeorm";
import { CompositeLaptop } from "../entities/CompositeLaptop";

@Resolver((of) => CompositeLaptop)
export default class CompositeLaptopResolver {
  @Query((returns) => [CompositeLaptop])
  async compositeLaptops(): Promise<CompositeLaptop[]> {
    return getRepository(CompositeLaptop).find();
  }
}
