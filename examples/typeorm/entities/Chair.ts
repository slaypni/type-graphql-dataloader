import { TypeormLoader } from "#/index";
import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm";
import { Lazy } from "../types/Lazy";
import { Base } from "./Base";
import { Company } from "./Company";
import { Desk } from "./Desk";

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
