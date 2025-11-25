/**
 * Utility Type Definitions
 * WhatsApp SaaS Platform
 *
 * This file contains advanced TypeScript utility types for type transformations,
 * conditional types, and type-safe helpers used throughout the application.
 */

/**
 * Makes all properties in T deeply optional (including nested objects)
 *
 * @template T - The type to make deeply partial
 * @example
 * type User = { name: string; address: { city: string } };
 * type PartialUser = DeepPartial<User>;
 * // { name?: string; address?: { city?: string } }
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Makes all properties in T deeply readonly (including nested objects)
 *
 * @template T - The type to make deeply readonly
 * @example
 * type User = { name: string; address: { city: string } };
 * type ReadonlyUser = DeepReadonly<User>;
 * // { readonly name: string; readonly address: { readonly city: string } }
 */
export type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : T;

/**
 * Makes all properties in T deeply required (including nested objects)
 *
 * @template T - The type to make deeply required
 * @example
 * type User = { name?: string; address?: { city?: string } };
 * type RequiredUser = DeepRequired<User>;
 * // { name: string; address: { city: string } }
 */
export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: DeepRequired<T[P]>;
    }
  : T;

/**
 * Makes specific properties K in type T required
 *
 * @template T - The base type
 * @template K - Keys to make required
 * @example
 * type User = { name?: string; email?: string; age?: number };
 * type UserWithName = RequiredBy<User, 'name' | 'email'>;
 * // { name: string; email: string; age?: number }
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Makes specific properties K in type T optional
 *
 * @template T - The base type
 * @template K - Keys to make optional
 * @example
 * type User = { name: string; email: string; age: number };
 * type UserWithOptionalAge = OptionalBy<User, 'age'>;
 * // { name: string; email: string; age?: number }
 */
export type OptionalBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Wraps type T to be nullable (T | null)
 *
 * @template T - The type to make nullable
 * @example
 * type Name = string;
 * type NullableName = Nullable<Name>; // string | null
 */
export type Nullable<T> = T | null;

/**
 * Wraps type T to be optional (T | undefined)
 *
 * @template T - The type to make optional
 * @example
 * type Name = string;
 * type OptionalName = Optional<Name>; // string | undefined
 */
export type Optional<T> = T | undefined;

/**
 * Wraps type T to be nullable or optional (T | null | undefined)
 *
 * @template T - The type to make maybe
 * @example
 * type Name = string;
 * type MaybeName = Maybe<Name>; // string | null | undefined
 */
export type Maybe<T> = T | null | undefined;

/**
 * Excludes null and undefined from type T
 *
 * @template T - The type to make non-nullable
 * @example
 * type MaybeName = string | null | undefined;
 * type Name = NonNullable<MaybeName>; // string
 */
export type NonNullish<T> = NonNullable<T>;

/**
 * Gets the union type of all values in object T
 *
 * @template T - The object type
 * @example
 * const Status = { ACTIVE: 'active', INACTIVE: 'inactive' } as const;
 * type StatusValue = ValueOf<typeof Status>; // 'active' | 'inactive'
 */
export type ValueOf<T> = T[keyof T];

/**
 * Gets the union type of all keys in object T as strings
 *
 * @template T - The object type
 * @example
 * type User = { name: string; age: number };
 * type UserKeys = KeysOf<User>; // 'name' | 'age'
 */
export type KeysOf<T> = keyof T & string;

/**
 * Extracts keys from T where the value type matches V
 *
 * @template T - The object type
 * @template V - The value type to match
 * @example
 * type User = { name: string; age: number; active: boolean };
 * type StringKeys = KeysMatching<User, string>; // 'name'
 */
export type KeysMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

/**
 * Creates a union of all possible paths through an object type
 *
 * @template T - The object type
 * @example
 * type User = { address: { city: string; zip: string } };
 * type Paths = PathsOf<User>; // 'address' | 'address.city' | 'address.zip'
 */
export type PathsOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? K | `${K}.${PathsOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

/**
 * Async state for data fetching operations
 * Represents the loading, success, and error states of async operations
 *
 * @template T - The data type
 * @template E - The error type (defaults to Error)
 */
export type AsyncState<T, E = Error> =
  | { status: 'idle'; data: undefined; error: undefined }
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: undefined; error: E };

/**
 * Alternative async state using discriminated union with loading flag
 *
 * @template T - The data type
 * @template E - The error type (defaults to Error)
 */
export interface LoadingState<T, E = Error> {
  /** Whether the operation is currently loading */
  loading: boolean;
  /** The data payload (undefined if not loaded) */
  data: T | undefined;
  /** The error (undefined if no error) */
  error: E | undefined;
}

/**
 * Paginated data wrapper
 *
 * @template T - The item type
 */
export interface Paginated<T> {
  /** Array of items */
  items: T[];
  /** Total number of items */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

/**
 * Extracts the awaited type from a Promise
 *
 * @template T - The Promise type
 * @example
 * type Data = Awaited<Promise<string>>; // string
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Extracts the element type from an array
 *
 * @template T - The array type
 * @example
 * type Numbers = number[];
 * type Number = ArrayElement<Numbers>; // number
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Makes a type mutable by removing readonly modifiers
 *
 * @template T - The type to make mutable
 * @example
 * type ReadonlyUser = { readonly name: string };
 * type MutableUser = Mutable<ReadonlyUser>; // { name: string }
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Deeply makes a type mutable
 *
 * @template T - The type to make deeply mutable
 */
export type DeepMutable<T> = T extends object
  ? {
      -readonly [P in keyof T]: DeepMutable<T[P]>;
    }
  : T;

/**
 * Creates a type with all properties of T except those in K, and then makes K properties optional
 *
 * @template T - The base type
 * @template K - Keys to make optional after picking
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Merges two types, with properties from B overriding properties from A
 *
 * @template A - The base type
 * @template B - The override type
 * @example
 * type A = { name: string; age: number };
 * type B = { age: string; active: boolean };
 * type Merged = Merge<A, B>; // { name: string; age: string; active: boolean }
 */
export type Merge<A, B> = Omit<A, keyof B> & B;

/**
 * Deeply merges two types
 *
 * @template A - The base type
 * @template B - The override type
 */
export type DeepMerge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? K extends keyof A
      ? A[K] extends object
        ? B[K] extends object
          ? DeepMerge<A[K], B[K]>
          : B[K]
        : B[K]
      : B[K]
    : K extends keyof A
    ? A[K]
    : never;
};

/**
 * Ensures that type T is a function, extracting its signature
 *
 * @template T - The function type
 */
export type Fn<T = any> = (...args: any[]) => T;

/**
 * Extracts parameter types from a function
 *
 * @template T - The function type
 * @example
 * type Func = (name: string, age: number) => void;
 * type Params = FunctionParams<Func>; // [string, number]
 */
export type FunctionParams<T extends Fn> = T extends (...args: infer P) => any ? P : never;

/**
 * Extracts return type from a function
 *
 * @template T - The function type
 * @example
 * type Func = (name: string) => number;
 * type Return = FunctionReturn<Func>; // number
 */
export type FunctionReturn<T extends Fn> = T extends (...args: any[]) => infer R ? R : never;

/**
 * Branded type for nominal typing
 * Creates a unique type that is structurally identical but nominally different
 *
 * @template T - The base type
 * @template Brand - The brand identifier
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type ProductId = Brand<string, 'ProductId'>;
 * // UserId and ProductId are incompatible even though both are strings
 */
export type Brand<T, Brand extends string> = T & { __brand: Brand };

/**
 * Opaque type for nominal typing (alternative to Brand)
 *
 * @template T - The base type
 * @template Token - The token identifier
 */
export type Opaque<T, Token = unknown> = T & { readonly __opaque: Token };

/**
 * Ensures a type is a valid JSON value
 */
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

/**
 * JSON object type
 */
export interface JSONObject {
  [key: string]: JSONValue;
}

/**
 * JSON array type
 */
export interface JSONArray extends Array<JSONValue> {}

/**
 * Prettifies a type by expanding all its properties
 * Useful for debugging complex intersection types
 *
 * @template T - The type to prettify
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Extracts non-function property names from a type
 *
 * @template T - The type to extract from
 */
export type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

/**
 * Extracts only non-function properties from a type
 *
 * @template T - The type to extract from
 */
export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

/**
 * Extracts function property names from a type
 *
 * @template T - The type to extract from
 */
export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

/**
 * Extracts only function properties from a type
 *
 * @template T - The type to extract from
 */
export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

/**
 * Constructs a type with all properties of T set to type V
 *
 * @template T - The type whose keys to use
 * @template V - The value type for all properties
 */
export type MapToType<T, V> = {
  [K in keyof T]: V;
};

/**
 * Tuple to union type conversion
 *
 * @template T - The tuple type
 * @example
 * type Tuple = [string, number, boolean];
 * type Union = TupleToUnion<Tuple>; // string | number | boolean
 */
export type TupleToUnion<T extends readonly any[]> = T[number];

/**
 * Union to intersection type conversion
 *
 * @template U - The union type
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * Type-safe string literals
 */
export type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

/**
 * Ensure that type T extends type U, otherwise return never
 *
 * @template T - The type to check
 * @template U - The type to extend
 */
export type Extends<T, U> = T extends U ? T : never;

/**
 * If condition type
 * Returns TrueType if T extends U, otherwise returns FalseType
 *
 * @template T - The type to check
 * @template U - The type to check against
 * @template TrueType - Type to return if condition is true
 * @template FalseType - Type to return if condition is false
 */
export type If<T extends boolean, TrueType, FalseType> = T extends true ? TrueType : FalseType;

/**
 * Strict Omit that errors if K is not a key of T
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;

/**
 * Strict Pick that errors if K is not a key of T
 */
export type StrictPick<T, K extends keyof T> = Pick<T, K>;

/**
 * Type guard function type
 *
 * @template T - The type to guard
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Type predicate function type
 *
 * @template T - The input type
 * @template U - The narrowed type
 */
export type TypePredicate<T, U extends T> = (value: T) => value is U;

/**
 * Creates a discriminated union helper
 *
 * @template K - The discriminant key
 * @template V - The discriminant value
 */
export type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = T extends Record<K, V>
  ? T
  : never;

/**
 * Reverses a mapped type to get original keys
 */
export type Reverse<T extends Record<string, string>> = {
  [K in T[keyof T]]: {
    [P in keyof T]: T[P] extends K ? P : never;
  }[keyof T];
};

/**
 * Constructor type
 *
 * @template T - The instance type
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * Abstract constructor type
 *
 * @template T - The instance type
 */
export type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;
