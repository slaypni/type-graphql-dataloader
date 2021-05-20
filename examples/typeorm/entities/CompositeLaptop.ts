import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from "typeorm";
import { Lazy } from "../types/Lazy";
import { Base } from "./Base";
import { CompositeDevice } from "./CompositeDevice";
import { CompositeOperatingSystem } from "./CompositeOperatingSystem";
import { Employee } from "./Employee";

@ObjectType()
@Entity()
export class CompositeLaptop extends Base<CompositeLaptop> {
  @Field()
  @PrimaryColumn()
  vendor: string;

  @Field((type) => ID)
  @PrimaryColumn()
  id: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;

  @Field((type) => Employee, { nullable: true })
  @OneToOne((type) => Employee, (employee) => employee.compositeLaptop, {
    nullable: true,
    lazy: true,
  })
  @TypeormLoader()
  employee: Lazy<Employee | null>;

  @Field((type) => [CompositeOperatingSystem])
  @OneToMany((type) => CompositeOperatingSystem, (os) => os.laptop, {
    lazy: true,
  })
  @TypeormLoader()
  operatingSystems: Lazy<CompositeOperatingSystem[]>;

  @Field((type) => [CompositeDevice])
  @ManyToMany((type) => CompositeDevice, (device) => device.laptops, {
    lazy: true,
  })
  @JoinTable()
  @TypeormLoader()
  devices: Lazy<CompositeDevice[]>;
}
