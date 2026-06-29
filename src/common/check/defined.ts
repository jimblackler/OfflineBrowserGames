export function assertDefined<T>(object: undefined extends T ? T : never) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (object === undefined) {
    throw new Error();
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return object as T extends undefined ? never : T;
}
