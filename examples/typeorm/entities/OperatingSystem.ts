import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Base } from "./Base";
import { Laptop } from "./Laptop";

@ObjectType()
@Entity()
export class OperatingSystem extends Base<OperatingSystem> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  oid: number;

  @Field()
  @Column()
  name: string;

  @Field((type) => Laptop)
  @ManyToOne((type) => Laptop, (laptop) => laptop.operatingSystems)
  @TypeormLoader()
  laptop: Laptop;
}
