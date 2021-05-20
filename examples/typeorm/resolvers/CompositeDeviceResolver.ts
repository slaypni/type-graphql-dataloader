import { Query, Resolver } from "type-graphql";
import { getRepository } from "typeorm";
import { CompositeDevice } from "../entities/CompositeDevice";

@Resolver((of) => CompositeDevice)
export default class CompositeDeviceResolver {
  @Query((returns) => [CompositeDevice])
  async compositeDevices(): Promise<CompositeDevice[]> {
    return getRepository(CompositeDevice).find();
  }
}
