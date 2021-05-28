import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Base } from "./Base";
import { CompositeLaptop } from "./CompositeLaptop";

@ObjectType()
@Entity()
export class CompositeOperatingSystem extends Base<CompositeOperatingSystem> {
  @Field()
  @PrimaryColumn()
  type: string;

  @Field((type) => ID)
  @PrimaryColumn()
  id: number;

  @Field()
  @Column()
  name: string;

  @Field((type) => CompositeLaptop)
  @ManyToOne((type) => CompositeLaptop, (laptop) => laptop.operatingSystems)
  @TypeormLoader()
  laptop: CompositeLaptop;
}
