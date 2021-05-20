import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Lazy } from "../types/Lazy";
import { Base } from "./Base";
import { Device } from "./Device";
import { Employee } from "./Employee";
import { OperatingSystem } from "./OperatingSystem";

@ObjectType()
@Entity()
export class Laptop extends Base<Laptop> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;

  @Field((type) => Employee, { nullable: true })
  @OneToOne((type) => Employee, (employee) => employee.laptop, {
    nullable: true,
    lazy: true,
  })
  @TypeormLoader()
  employee: Lazy<Employee | null>;

  @Field((type) => [OperatingSystem])
  @OneToMany((type) => OperatingSystem, (os) => os.laptop, {
    lazy: true,
  })
  @TypeormLoader()
  operatingSystems: Lazy<OperatingSystem[]>;

  @Field((type) => [Device])
  @ManyToMany((type) => Device, (device) => device.laptops, {
    lazy: true,
  })
  @JoinTable()
  @TypeormLoader()
  devices: Lazy<Device[]>;
}
