import { ObjectType, Field, ID } from "type-graphql";
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
  RelationId,
} from "typeorm";
import { Employee } from "./Employee";
import { Desk } from "./Desk";
import { Base } from "./Base";
import { Company } from "./Company";
import { Lazy } from "../types/Lazy";
import { TypeormLoader } from "#/index";

@ObjectType()
@Entity()
export class Chair extends Base<Chair> {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field((type) => Company)
  @ManyToOne((type) => Company, (company) => company.desks)
  @TypeormLoader((type) => Company, (chair: Chair) => chair.companyId)
  company: Company;

  @RelationId((chair: Chair) => chair.company)
  companyId: string;

  @Field((type) => Desk)
  @OneToOne((type) => Desk, (desk) => desk.chair, { lazy: true })
  @JoinColumn()
  desk: Lazy<Desk>;

  @RelationId((chair: Chair) => chair.desk)
  deskId: number;
}
