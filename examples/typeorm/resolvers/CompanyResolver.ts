import { Loader } from "#/index";
import DataLoader from "dataloader";
import { groupBy } from "lodash";
import { FieldResolver, Query, Resolver, Root } from "type-graphql";
import { In } from "typeorm";
import { Chair } from "../entities/Chair";
import { Company } from "../entities/Company";
import { getDataSource } from "../getDataSource";

@Resolver((of) => Company)
export default class CompanyResolver {
  @Query((returns) => [Company])
  async companies(): Promise<Company[]> {
    return (await getDataSource()).getRepository(Company).find();
  }

  @FieldResolver()
  @Loader<string, Chair[]>(async (ids) => {
    const chairs = await (await getDataSource()).getRepository(Chair).find({
      where: { company: { id: In([...ids]) } },
    });
    const chairsById = groupBy(chairs, "companyId");
    return ids.map((id) => chairsById[id] ?? []);
  })
  chairs(@Root() root: Company) {
    return (dataloader: DataLoader<string, Chair[]>) =>
      dataloader.load(root.id);
  }
}
