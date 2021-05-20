import { Query, Resolver } from "type-graphql";
import { getRepository } from "typeorm";
import { Laptop } from "../entities/Laptop";

@Resolver((of) => Laptop)
export default class LaptopResolver {
  @Query((returns) => [Laptop])
  async laptops(): Promise<Laptop[]> {
    return getRepository(Laptop).find();
  }
}
