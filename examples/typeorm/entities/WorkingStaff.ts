import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Lazy } from "../types/Lazy";
import { Base } from "./Base";
import { CompositeLaptop } from "./CompositeLaptop";
import { Laptop } from "./Laptop";

@ObjectType()
@Entity()
export class WorkingStaff extends Base<WorkingStaff> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn("uuid")
  wid: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;

  @Field((type) => Laptop, { nullable: true })
  @OneToOne(() => Laptop, (laptop) => laptop.staff, {
    nullable: true,
    lazy: true,
  })
  @JoinColumn()
  @TypeormLoader()
  laptop: Lazy<Laptop | null>;

  @Field((type) => CompositeLaptop, { nullable: true })
  @OneToOne(() => CompositeLaptop, (cl) => cl.staff, {
    nullable: true,
    lazy: true,
  })
  @JoinColumn()
  @TypeormLoader()
  compositeLaptop: Lazy<CompositeLaptop | null>;
}
