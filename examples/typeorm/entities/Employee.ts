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
import { CompositeLaptop } from "./CompositeLaptop";
import { Desk } from "./Desk";
import { Laptop } from "./Laptop";

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

  @Field((type) => Laptop, { nullable: true })
  @OneToOne(() => Laptop, (laptop) => laptop.employee, {
    nullable: true,
    lazy: true,
  })
  @JoinColumn()
  @TypeormLoader()
  laptop: Lazy<Laptop | null>;

  @Field((type) => CompositeLaptop, { nullable: true })
  @OneToOne(() => CompositeLaptop, (cl) => cl.employee, {
    nullable: true,
    lazy: true,
  })
  @JoinColumn()
  @TypeormLoader()
  compositeLaptop: Lazy<CompositeLaptop | null>;

  @Field((type) => [Cert])
  @ManyToMany((type) => Cert, (cert) => cert.employees, { lazy: true })
  @JoinTable()
  @TypeormLoader((type) => Cert, (employee: Employee) => employee.certIds)
  certs: Lazy<Cert[]>;

  @Field((type) => [Number])
  @RelationId((employee: Employee) => employee.certs)
  certIds: number[];
}
