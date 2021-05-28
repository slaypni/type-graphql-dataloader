import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Base } from "./Base";
import { Laptop } from "./Laptop";

@ObjectType()
@Entity()
export class Device extends Base<Device> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  did: number;

  @Field()
  @Column()
  name: string;

  @Field((type) => [Laptop])
  @ManyToMany((type) => Laptop, (laptop) => laptop.devices)
  @JoinTable()
  @TypeormLoader()
  laptops: Laptop[];
}
