import { TypeormLoader } from "#/index";
import { Field, ObjectType } from "type-graphql";
import { Entity, ManyToMany, ManyToOne, PrimaryColumn } from "typeorm";
import { Lazy } from "../types/Lazy";
import { Base } from "./Base";
import { Company } from "./Company";
import { Desk } from "./Desk";
import { PersonalComputer } from "./PersonalComputer";

@ObjectType()
@Entity()
export class ApplicationSoftware extends Base<ApplicationSoftware> {
  @Field()
  @PrimaryColumn()
  name: string;

  @Field()
  @PrimaryColumn()
  majorVersion: number;

  @Field()
  @PrimaryColumn()
  minorVersion: number;

  @Field((type) => [PersonalComputer])
  @ManyToMany((type) => PersonalComputer, (pc) => pc.installedApps)
  @TypeormLoader()
  installedComputers: PersonalComputer[];

  @Field((type) => Company)
  @ManyToOne((type) => Company, (company) => company.publishedApps, {
    lazy: true,
  })
  @TypeormLoader()
  publishedBy: Lazy<Company>;
}
