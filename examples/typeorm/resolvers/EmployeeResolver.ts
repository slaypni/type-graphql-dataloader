import { Query, Resolver } from "type-graphql";
import { Employee } from "../entities/Employee";
import { getDataSource } from "../getDataSource";

@Resolver((of) => Employee)
export default class EmployeeResolver {
  @Query((returns) => [Employee])
  async employees(): Promise<Employee[]> {
    return (await getDataSource()).getRepository(Employee).find();
  }
}
