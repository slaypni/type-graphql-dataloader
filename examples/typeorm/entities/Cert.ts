import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm";
import { Lazy } from "../types/Lazy";
import { Base } from "./Base";
import { Employee } from "./Employee";

@ObjectType()
@Entity()
export class Cert extends Base<Cert> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  cid: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;

  @Field((type) => [Employee])
  @ManyToMany((type) => Employee, (employee) => employee.certs, { lazy: true })
  @TypeormLoader((cert: Cert) => cert.employeeIds)
  employees: Lazy<Employee[]>;

  @Field((type) => [String])
  @RelationId((cert: Cert) => cert.employees)
  employeeIds: string[];
}
