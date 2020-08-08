import { Resolver, Query, FieldResolver, Root } from "type-graphql";
import { getRepository, In } from "typeorm";
import DataLoader from "dataloader";
import { groupBy } from "lodash";
import { Loader } from "#/index";
import { Company } from "../entities/Company";
import { Chair } from "../entities/Chair";

@Resolver((of) => Company)
export default class CompanyResolver {
  @Query((returns) => [Company])
  async companies(): Promise<Company[]> {
    return getRepository(Company).find();
  }

  @FieldResolver()
  @Loader<string, Chair[]>(async (ids) => {
    const chairs = await getRepository(Chair).find({
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
