import type { ObjectType } from "typeorm";
import { ExplicitLoaderImpl } from "./ExplicitLoaderImpl";
import { ImplicitLoaderImpl } from "./ImplicitLoaderImpl";

type KeyFunc = (root: any) => any | any[] | undefined;

export interface TypeormLoaderOption {
  selfKey: boolean;
}

export function TypeormLoader(): PropertyDecorator;

export function TypeormLoader(
  keyFunc: KeyFunc,
  option?: TypeormLoaderOption
): PropertyDecorator;

export function TypeormLoader<V>(
  typeFunc: (type?: void) => ObjectType<V>,
  keyFunc: KeyFunc,
  option?: TypeormLoaderOption
): PropertyDecorator;

export function TypeormLoader<V>(
  typeFuncOrKeyFunc?: ((type?: void) => ObjectType<V>) | KeyFunc,
  keyFuncOrOption?: KeyFunc | TypeormLoaderOption,
  option?: TypeormLoaderOption
): PropertyDecorator {
  if (typeFuncOrKeyFunc == null) {
    return ImplicitLoaderImpl();
  }

  const getArgs = (): [KeyFunc, TypeormLoaderOption | undefined] => {
    return option != null || typeof keyFuncOrOption == "function"
      ? [keyFuncOrOption as KeyFunc, option]
      : [typeFuncOrKeyFunc as KeyFunc, keyFuncOrOption as TypeormLoaderOption];
  };
  return ExplicitLoaderImpl<V>(...getArgs());
}
