import type { ObjectType, SelectQueryBuilder } from "typeorm";
import { ExplicitLoaderImpl } from "./ExplicitLoaderImpl";
import { ImplicitLoaderImpl } from "./ImplicitLoaderImpl";


export interface TypeormLoaderOption {
  selfKey: boolean;
}
export type KeyFunc = (root: any) => any | any[] | undefined;
export type FilterQuery = <T>(qb: SelectQueryBuilder<T>, context?: any) => void;

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

export function FilteredTypeormLoader(
  filterQuery: FilterQuery
): PropertyDecorator;

export function FilteredTypeormLoader(
  filterQuery: FilterQuery,
  keyFunc: KeyFunc,
  option?: TypeormLoaderOption
): PropertyDecorator;

export function FilteredTypeormLoader<V>(
  filterQuery: FilterQuery,
  typeFunc: (type?: void) => ObjectType<V>,
  keyFunc: KeyFunc,
  option?: TypeormLoaderOption
): PropertyDecorator;

export function FilteredTypeormLoader<V>(
  filterQuery: FilterQuery,
  typeFuncOrKeyFunc?: ((type?: void) => ObjectType<V>) | KeyFunc,
  keyFuncOrOption?: KeyFunc | TypeormLoaderOption,
  option?: TypeormLoaderOption
): PropertyDecorator {
  if (typeFuncOrKeyFunc == null) {
    return ImplicitLoaderImpl(filterQuery);
  }

  const getArgs = (): [KeyFunc, TypeormLoaderOption | undefined] => {
    return option != null || typeof keyFuncOrOption == "function"
      ? [keyFuncOrOption as KeyFunc, option]
      : [typeFuncOrKeyFunc as KeyFunc, keyFuncOrOption as TypeormLoaderOption];
  };
  return ExplicitLoaderImpl<V>(...getArgs(), filterQuery);
}

