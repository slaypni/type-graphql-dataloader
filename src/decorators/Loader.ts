import { UseMiddleware, ResolverData } from "type-graphql";
import { MethodAndPropDecorator } from "type-graphql/dist/decorators/types";

export function Loader(
  resolver: (resolverData: ResolverData<{}>) => void = () => {}
): MethodAndPropDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>
  ) => {
    console.log({ target: target.constructor, fieldName: propertyKey });
    const isResolver = Boolean(descriptor);
    const isResolverMethod = Boolean(descriptor && descriptor.value);
    UseMiddleware(async ({ root, context }, next) => {
      console.log(root);
      console.log(context);
      console.log(await next());
    })(target, propertyKey);
  };
}
