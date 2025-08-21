/**
 * Transforms all non-async methods of a type T into async methods.
 * Methods already returning Promise<T> are left unchanged.
 */
export type Asyncify<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => Promise<infer R>
    ? (...args: A) => Promise<R> // Already async — leave as-is
    : T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R> // Not async — convert to Promise
    : T[K]; // Not a method — leave as-is
};
