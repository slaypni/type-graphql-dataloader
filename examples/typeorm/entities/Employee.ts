import { ObjectType, Field, ID } from "type-graphql";
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  RelationId,
} from "typeorm";
import { Company } from "./Company";
import { Desk } from "./Desk";
import { Base } from "./Base";
import { Cert } from "./Cert";
import { Lazy } from "../types/Lazy";
import { TypeormLoader } from "#/index";

@ObjectType()
@Entity()
export class Employee extends Base<Employee> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn("uuid")
  id: string;

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
