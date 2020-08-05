import { ObjectType, Field, ID } from "type-graphql";
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  ManyToOne,
  RelationId,
} from "typeorm";
import { Employee } from "./Employee";
import { Chair } from "./Chair";
import { Base } from "./Base";
import { Company } from "./Company";
import { Lazy } from "../types/Lazy";
import { TypeormLoader } from "#/index";

@ObjectType()
@Entity()
export class Desk extends Base<Desk> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field((type) => Company)
  @ManyToOne((type) => Company, (company) => company.desks, { lazy: true })
  company: Lazy<Company>;

  @Field((type) => Employee, { nullable: true })
  @OneToOne((type) => Employee, (employee) => employee.desk, {
    nullable: true,
    lazy: true,
  })
  @TypeormLoader((type) => Employee, (desk: Desk) => desk.employeeId)
  employee: Lazy<Employee | null>;

  @Field((type) => String, { nullable: true })
  @RelationId((desk: Desk) => desk.employee)
  employeeId?: string;

  @Field((type) => Chair, { nullable: true })
  @OneToOne((type) => Chair, (chair) => chair.desk, {
    lazy: true,
    nullable: true,
  })
  @TypeormLoader((type) => Chair, (chair: Chair) => chair.deskId, {
    selfKey: true,
  })
  chair: Lazy<Chair | null>;
}
