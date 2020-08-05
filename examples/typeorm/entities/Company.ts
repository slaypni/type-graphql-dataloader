import { ObjectType, Field, ID } from "type-graphql";
import { Entity, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { Base } from "./Base";
import { Employee } from "./Employee";
import { Desk } from "./Desk";
import { Lazy } from "../types/Lazy";
import { Chair } from "./Chair";
import { TypeormLoader } from "#/index";

@ObjectType()
@Entity()
export class Company extends Base<Company> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Field((type) => [Employee])
  @OneToMany((type) => Employee, (employee) => employee.company, { lazy: true })
  @TypeormLoader((type) => Employee, (employee: Employee) => employee.companyId)
  employees: Lazy<Employee[]>;

  @Field((type) => [Desk])
  @OneToMany((type) => Desk, (desk) => desk.company, { lazy: true })
  desks: Lazy<Desk[]>;

  @Field((type) => [Chair])
  @OneToMany((type) => Chair, (chair) => chair.company, { lazy: true })
  chairs: Lazy<Chair[]>;
}
