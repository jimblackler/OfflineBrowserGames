export function assertString(object: unknown) {
  if (typeof object !== 'string') {
    throw new Error();
  }
  return object;
}
