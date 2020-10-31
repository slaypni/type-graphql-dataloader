import { UseMiddleware, ArgsDictionary } from "type-graphql";
import { MethodAndPropDecorator } from "type-graphql/dist/decorators/types";
import DataLoader from "dataloader";
import Container from "typedi";
import { TgdContext } from "#/types/TgdContext";

interface ResolverData<ContextType = {}> {
  args: ArgsDictionary;
  context: ContextType;
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
    UseMiddleware(async ({ args, context }, next) => {
      const serviceId = `tgd#${
        target.constructor.name
      }#${propertyKey.toString()}`;
      const { requestId } = context._tgdContext as TgdContext;
      const container = Container.of(requestId);
      if (!container.has(serviceId)) {
        container.set(
          serviceId,
          new DataLoader(
            (keys) => batchLoadFn(keys, { args, context }),
            options
          )
        );
      }
      const dataloader = container.get(serviceId);
      return await (await next())(dataloader);
    })(target, propertyKey);
  };
}
