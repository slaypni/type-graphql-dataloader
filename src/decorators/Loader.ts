import type { TgdContext } from "#/types/TgdContext";
import DataLoader from "dataloader";
import { UseMiddleware } from "type-graphql";
import { MethodAndPropDecorator } from "type-graphql/dist/decorators/types";
import Container from "typedi";

interface ResolverData {
  context: any;
}

type BatchLoadFn<K, V> = (
  keys: ReadonlyArray<K>,
  data: ResolverData
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
    UseMiddleware(async ({ context }, next) => {
      const serviceId = `tgd#${
        target.constructor.name
      }#${propertyKey.toString()}`;
      const { requestId } = context._tgdContext as TgdContext;
      const container = Container.of(requestId);
      if (!container.has(serviceId)) {
        container.set(
          serviceId,
          new DataLoader((keys) => batchLoadFn(keys, { context }), options)
        );
      }
      const dataloader = container.get(serviceId);
      return await (
        await next()
      )(dataloader);
    })(target, propertyKey);
  };
}
