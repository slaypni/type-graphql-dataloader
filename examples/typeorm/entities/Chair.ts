import { ObjectType, Field, ID } from "type-graphql";
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
  RelationId,
} from "typeorm";
import { Employee } from "./Employee";
import { Desk } from "./Desk";
import { Base } from "./Base";
import { Company } from "./Company";
import { Lazy } from "../types/Lazy";

@ObjectType()
@Entity()
export class Chair extends Base<Chair> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field((type) => Company)
  @ManyToOne((type) => Company, (company) => company.desks)
  company: Company;

  @Field((type) => Employee)
  @OneToOne((type) => Employee, (employee) => employee.desk)
  employee: Employee;

  @Field((type) => Desk)
  @OneToOne((type) => Desk, (desk) => desk.chair, { lazy: true })
  @JoinColumn()
  desk: Lazy<Desk>;

  @RelationId((chair: Chair) => chair.desk)
  deskId: number;
}
