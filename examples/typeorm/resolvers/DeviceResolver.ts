import { Query, Resolver } from "type-graphql";
import { getRepository } from "typeorm";
import { Device } from "../entities/Device";

@Resolver((of) => Device)
export default class DeviceResolver {
  @Query((returns) => [Device])
  async devices(): Promise<Device[]> {
    return getRepository(Device).find();
  }
}
