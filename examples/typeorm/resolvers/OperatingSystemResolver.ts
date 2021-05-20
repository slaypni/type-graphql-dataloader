import { Query, Resolver } from "type-graphql";
import { getRepository } from "typeorm";
import { OperatingSystem } from "../entities/OperatingSystem";

@Resolver((of) => OperatingSystem)
export default class OperatingSystemResolver {
  @Query((returns) => [OperatingSystem])
  async operatingSystems(): Promise<OperatingSystem[]> {
    return getRepository(OperatingSystem).find();
  }
}
