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
} from "typeorm";
import { Lazy } from "../types/Lazy";
import { Base } from "./Base";
import { Company } from "./Company";
import { Desk } from "./Desk";
import { ApplicationSoftware } from "./ApplicationSoftware";

@ObjectType()
@Entity()
export class PersonalComputer extends Base<Desk> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;

  @Field((type) => Company)
  @ManyToOne((type) => Company, (company) => company.desktopComputers)
  @TypeormLoader()
  propertyOf: Company;

  @Field((type) => Desk, { nullable: true })
  @OneToOne((type) => Desk, (desk) => desk.desktopComputer, {
    nullable: true,
    lazy: true,
  })
  @JoinColumn()
  @TypeormLoader()
  placedAt: Lazy<Desk | null>;

  @Field((type) => ApplicationSoftware)
  @ManyToMany((type) => ApplicationSoftware, (app) => app.installedComputers)
  @JoinTable()
  @TypeormLoader()
  installedApps: ApplicationSoftware[];
}
