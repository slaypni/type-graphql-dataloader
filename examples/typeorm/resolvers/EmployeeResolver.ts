import { Resolver, Query, Ctx } from "type-graphql";
import { getRepository } from "typeorm";
import { Employee } from "../entities/Employee";

@Resolver((of) => Employee)
export default class EmployeeResolver {
  @Query((returns) => [Employee])
  async employees(@Ctx() ctx: { typeormConnectionName: string; }): Promise<Employee[]> {
    return getRepository(Employee, ctx.typeormConnectionName).find();
  }
}
