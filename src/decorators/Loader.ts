import { UseMiddleware, ResolverData } from "type-graphql";
import { MethodAndPropDecorator } from "type-graphql/dist/decorators/types";
import DataLoader from "dataloader";
import Container from "typedi";
import { TgdContext } from "#/types/TgdContext";

type BatchLoadFn<K, V> = (
  keys: ReadonlyArray<K>,
  data: ResolverData<any>
) => PromiseLike<ArrayLike<V | Error>>;

export function Loader<K, V, C = K>(
  batchLoadFn: BatchLoadFn<K, V>,
  options?: DataLoader.Options<K, V, C>
): MethodAndPropDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>
  ) => {
    UseMiddleware(async (data, next) => {
      const serviceId = `tgd#${
        target.constructor.name
      }#${propertyKey.toString()}`;
      const { requestId } = data.context._tgdContext as TgdContext;
      const container = Container.of(requestId);
      if (!container.has(serviceId)) {
        container.set(
          serviceId,
          new DataLoader((keys) => batchLoadFn(keys, data), options)
        );
      }
      const dataloader = container.get(serviceId);
      return await (await next())(dataloader);
    })(target, propertyKey);
  };
}
