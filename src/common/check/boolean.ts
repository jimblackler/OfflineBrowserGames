export function assertBoolean(object: unknown) {
  if (typeof object !== 'boolean') {
    throw new Error();
  }
  return object;
}
