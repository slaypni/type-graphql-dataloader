import { Resolver, Query } from "type-graphql";
import { getRepository } from "typeorm";
import { Company } from "../entities/Company";

@Resolver((of) => Company)
export default class CompanyResolver {
  @Query((returns) => [Company])
  async companies(): Promise<Company[]> {
    return getRepository(Company).find();
  }
}
