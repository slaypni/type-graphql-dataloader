import { Resolver, Query, FieldResolver, Root, Ctx } from "type-graphql";
import { getRepository, In } from "typeorm";
import DataLoader from "dataloader";
import { groupBy } from "lodash";
import { Loader } from "#/index";
import { Company } from "../entities/Company";
import { Chair } from "../entities/Chair";

@Resolver((of) => Company)
export default class CompanyResolver {
  @Query((returns) => [Company])
  async companies(@Ctx() ctx: { typeormConnectionName: () => Promise<string>; }): Promise<Company[]> {
    return getRepository(Company, await ctx.typeormConnectionName()).find();
  }

  @FieldResolver()
  @Loader<string, Chair[]>(async (ids, ctx) => {
    const chairs = await getRepository(Chair, await ctx.context.typeormConnectionName()).find({
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
