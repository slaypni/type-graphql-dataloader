import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm";
import { Lazy } from "../types/Lazy";
import { Base } from "./Base";
import { Chair } from "./Chair";
import { Company } from "./Company";
import { Employee } from "./Employee";
import { PersonalComputer } from "./PersonalComputer";

@ObjectType()
@Entity()
export class Desk extends Base<Desk> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;

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

  @Field((type) => PersonalComputer, { nullable: true })
  @OneToOne((type) => PersonalComputer, (pc) => pc.placedAt, {
    lazy: true,
    nullable: true,
  })
  @TypeormLoader()
  desktopComputer: Lazy<PersonalComputer | null>;
}
