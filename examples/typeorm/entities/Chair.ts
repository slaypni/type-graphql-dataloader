import { ObjectType, Field, ID } from "type-graphql";
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
  RelationId,
  Column,
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

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;

  @Field((type) => Company)
  @ManyToOne((type) => Company, (company) => company.desks)
  @TypeormLoader((type) => Company, (chair: Chair) => chair.companyId)
  company: Company;

  @RelationId((chair: Chair) => chair.company)
  companyId: string;

  @Field((type) => Desk, { nullable: true })
  @OneToOne((type) => Desk, (desk) => desk.chair, {
    lazy: true,
    nullable: true,
  })
  @JoinColumn()
  desk: Lazy<Desk | null>;

  @RelationId((chair: Chair) => chair.desk)
  deskId?: number;
}
