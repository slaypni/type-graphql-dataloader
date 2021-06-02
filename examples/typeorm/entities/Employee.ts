import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm";
import { Lazy } from "../types/Lazy";
import { Base } from "./Base";
import { Cert } from "./Cert";
import { Company } from "./Company";
import { Desk } from "./Desk";

@ObjectType()
@Entity()
export class Employee extends Base<Employee> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn("uuid")
  eid: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;

  @Field((type) => Company)
  @ManyToOne((type) => Company, (company) => company.employees, { lazy: true })
  @TypeormLoader((type) => Company, (employee: Employee) => employee.companyId)
  company: Lazy<Company>;

  @RelationId((employee: Employee) => employee.company)
  companyId?: string;

  @Field((type) => Desk, { nullable: true })
  @OneToOne((type) => Desk, (desk) => desk.employee, {
    nullable: true,
    lazy: true,
  })
  @JoinColumn()
  @TypeormLoader((type) => Desk, (employee: Employee) => employee.deskId)
  desk: Lazy<Desk | null>;

  @RelationId((employee: Employee) => employee.desk)
  deskId?: number;

  @Field((type) => [Cert])
  @ManyToMany((type) => Cert, (cert) => cert.employees, { lazy: true })
  @JoinTable()
  @TypeormLoader((type) => Cert, (employee: Employee) => employee.certIds)
  certs: Lazy<Cert[]>;

  @Field((type) => [Number])
  @RelationId((employee: Employee) => employee.certs)
  certIds: number[];
}
