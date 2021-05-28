import { Query, Resolver } from "type-graphql";
import { getRepository } from "typeorm";
import { CompositeOperatingSystem } from "../entities/CompositeOperatingSystem";

@Resolver((of) => CompositeOperatingSystem)
export default class CompositeOperatingSystemResolver {
  @Query((returns) => [CompositeOperatingSystem])
  async compositeOperatingSystems(): Promise<CompositeOperatingSystem[]> {
    return getRepository(CompositeOperatingSystem).find();
  }
}
