export abstract class Base<T> {
  constructor(args?: Partial<T>) {
    Object.assign(this, args ?? {});
  }
}
