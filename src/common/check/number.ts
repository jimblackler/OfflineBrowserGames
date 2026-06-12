export function assertNumber(object: unknown) {
  if (typeof object !== 'number') {
    throw new Error();
  }
  return object;
}
