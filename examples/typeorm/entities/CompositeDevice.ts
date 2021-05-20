import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import { Column, Entity, JoinTable, ManyToMany, PrimaryColumn } from "typeorm";
import { Lazy } from "../types/Lazy";
import { Base } from "./Base";
import { CompositeLaptop } from "./CompositeLaptop";

@ObjectType()
@Entity()
export class CompositeDevice extends Base<CompositeDevice> {
  @Field()
  @PrimaryColumn()
  type: string;

  @Field((type) => ID)
  @PrimaryColumn()
  id: number;

  @Field()
  @Column()
  name: string;

  @Field((type) => [CompositeLaptop])
  @ManyToMany((type) => CompositeLaptop, (laptop) => laptop.devices, {
    lazy: true,
  })
  @JoinTable()
  @TypeormLoader()
  laptops: Lazy<CompositeLaptop[]>;
}
