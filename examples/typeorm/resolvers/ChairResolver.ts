import { Resolver, Query } from "type-graphql";
import { getRepository } from "typeorm";
import { Chair } from "../entities/Chair";

@Resolver((of) => Chair)
export default class ChairResolver {
  @Query((returns) => [Chair])
  async seats(): Promise<Chair[]> {
    return getRepository(Chair).find();
  }
}
