/**
 * Deterministic pseudo-random number generation.
 *
 * Every source of variation in The Archipelago is derived from a string seed so
 * that identical seeds and identical command sequences always reproduce the
 * same history. `Math.random` and wall-clock time are never used.
 */

/** cyrb128: hashes a string into four 32-bit seeds. */
function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export interface Rng {
  /** The seed this generator was derived from. */
  readonly seed: string;
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Uniformly chooses one element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Returns true with probability p. */
  chance(p: number): boolean;
  /** Derives an independent, reproducible child generator. */
  derive(label: string): Rng;
}

/** Creates an sfc32 generator seeded from a string. */
export function createRng(seed: string): Rng {
  let [a, b, c, d] = cyrb128(seed);
  const next = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  // Discard the first outputs to decorrelate similar seeds.
  for (let i = 0; i < 15; i++) next();

  const rng: Rng = {
    seed,
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new RangeError(`invalid integer range [${min}, ${max}]`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      if (items.length === 0) throw new RangeError("cannot pick from an empty array");
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    chance(p) {
      return next() < p;
    },
    derive(label) {
      return createRng(`${seed}/${label}`);
    },
  };
  return rng;
}
