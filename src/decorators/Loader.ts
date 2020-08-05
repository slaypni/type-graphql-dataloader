import { UseMiddleware, ResolverData } from "type-graphql";
import { MethodAndPropDecorator } from "type-graphql/dist/decorators/types";
import DataLoader from "dataloader";
import Container from "typedi";
import { TgdContext } from "#/types/TgdContext";

export function Loader<K, V, C = K>(
  batchLoadFn: DataLoader.BatchLoadFn<K, V>,
  options?: DataLoader.Options<K, V, C>
): MethodAndPropDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>
  ) => {
    UseMiddleware(async ({ context }, next) => {
      const serviceId = `tgd#${
        target.constructor.name
      }#${propertyKey.toString()}`;
      const { requestId } = context._tgdContext as TgdContext;
      const container = Container.of(requestId);
      if (!container.has(serviceId)) {
        container.set(serviceId, new DataLoader(batchLoadFn, options));
      }
      const dataloader = container.get(serviceId);
      return await (await next())(dataloader);
    })(target, propertyKey);
  };
}
