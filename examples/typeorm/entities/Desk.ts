import { ObjectType, Field, ID } from "type-graphql";
import { Entity, PrimaryGeneratedColumn, OneToOne, ManyToOne } from "typeorm";
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

  @Field((type) => Employee)
  @OneToOne((type) => Employee, (employee) => employee.desk, {
    nullable: true,
    lazy: true,
  })
  employee: Lazy<Employee | null>;

  @Field((type) => Chair, { nullable: true })
  @OneToOne((type) => Chair, (chair) => chair.desk, {
    lazy: true,
    nullable: true,
  })
  @TypeormLoader((type) => Chair, (chair: Chair) => chair.deskId)
  chair: Lazy<Chair | null>;
}
