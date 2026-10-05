// Adversarial but VALID TypeScript. Every construct here commonly breaks naive
// parsers: generic call signatures, type arguments that look like comparisons,
// regex literals containing angle brackets, template literals with interpolation,
// ternaries, satisfies/as casts, and declaration merging.
// deep-era must report ZERO structural problems on this file.
export type Maybe<T> = T | null | undefined;
export type Fn = <T>(x: T) => T;

export interface User<T extends { id: string }> {
  id: string;
  meta: T;
  tags?: Array<string>;
  nested: { deep: { deeper: (n: number) => Maybe<T> } };
}

export const identity: Fn = <T,>(x: T) => x;

export function pick<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

export class Box<T> {
  private items: Maybe<T>[] = [];
  add(item: T): this {
    this.items.push(item);
    return this;
  }
  map<U>(fn: (t: T) => U): Box<U> {
    const next = new Box<U>();
    for (const item of this.items) {
      if (item != null) next.add(fn(item));
    }
    return next;
  }
}

const compare = (a: number, b: number): number => (a < b ? -1 : a > b ? 1 : 0);
const ratio = 10 / 2 / 1;
const tagPattern = /<div>[^<]*<\/div>/g;
const quotient = 10 / ratio;
const template = `x ${compare(1, 2) < 0 ? "<" : ">"} y ${ratio} ${pick({ id: "1" }, "id")}`;
const record = { alpha: 1, beta: 2, "gamma-delta": 3, 4: 5 };
const cast = record as unknown as Record<string, number>;
const checked = record satisfies Record<string, number>;
const escaped = 'it\'s fine';
const doubled = 10 / 2 / 1;

declare module "virtual:mod" {
  export const injected: number;
}

enum Level { Low = 1, High = 2 }

export default { identity, pick, Box, compare, ratio, tagPattern, quotient, template, record, cast, checked, escaped, doubled, Level };
