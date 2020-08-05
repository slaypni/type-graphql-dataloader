import { Resolver, Query } from "type-graphql";
import { getRepository } from "typeorm";
import { Employee } from "../entities/Employee";

@Resolver((of) => Employee)
export default class EmployeeResolver {
  @Query((returns) => [Employee])
  async employees(): Promise<Employee[]> {
    return getRepository(Employee).find();
  }
}
