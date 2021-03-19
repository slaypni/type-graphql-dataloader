import { Resolver, Query, Ctx } from "type-graphql";
import { getRepository } from "typeorm";
import { Employee } from "../entities/Employee";

@Resolver((of) => Employee)
export default class EmployeeResolver {
  @Query((returns) => [Employee])
  async employees(@Ctx() ctx: { typeormConnectionName: () => Promise<string>; }): Promise<Employee[]> {
    return getRepository(Employee, await ctx.typeormConnectionName()).find();
  }
}
