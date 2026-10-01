import type { ChoicePoint } from "../agents/choice.js";

/**
 * The order in which a branch sweep takes alternatives. Nothing here is
 * random, and the order is not the record's either: it is declared so that
 * a bounded sweep is fair, unbiased and representative.
 *
 *   fair          every citizen takes one alternative before any takes a
 *                 second (round-robin over citizens, in identifier order);
 *   unbiased      within a citizen, the kinds of choice rotate (kin,
 *                 intention, place, …) so no kind is privileged, and within
 *                 a choice point the alternatives are taken in canonical
 *                 order, one per visit, so no option is privileged;
 *   representative within one citizen and kind, points are visited in
 *                 van der Corput (bit-reversed) order of their position in
 *                 the record, so the first few picks are spread across the
 *                 whole epilogue instead of clustered at its start.
 *
 * Dermot's principle (2026-10-02): the enumeration order needs to be fair,
 * unbiased and representative; randomness just means underdetermined or not
 * fully known. This order is fully known.
 */
export const ENUMERATION = "fair-round-robin/van-der-corput/v1";

export interface Alternative {
  readonly point: ChoicePoint;
  readonly option: number;
  /** Position in the enumeration, from 1. */
  readonly rank: number;
  /** Which pass over the citizens produced it, from 1. */
  readonly pass: number;
}

/** Indices 0..n-1 in bit-reversed order: 0, n/2, n/4, 3n/4, … (a low-discrepancy visiting order). */
export function vanDerCorputOrder(n: number): number[] {
  if (n <= 0) return [];
  let bits = 0;
  while (1 << bits < n) bits++;
  const reverse = (i: number) => {
    let r = 0;
    for (let b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1);
    return r;
  };
  return Array.from({ length: 1 << bits }, (_, i) => reverse(i)).filter((i) => i < n);
}

/** Every alternative of every point, in the declared order, up to `budget`. */
export function fairEnumeration(points: readonly ChoicePoint[], budget: number): Alternative[] {
  // strata: citizen → label → points in record order
  const byCitizen = new Map<string, Map<string, ChoicePoint[]>>();
  for (const p of points) {
    if (p.options.length < 2) continue;
    const labels = byCitizen.get(p.citizen) ?? new Map<string, ChoicePoint[]>();
    byCitizen.set(p.citizen, labels);
    labels.set(p.label, [...(labels.get(p.label) ?? []), p]);
  }
  // each stratum's alternatives: first alternative of each point in van der Corput order, then second alternatives, …
  const queues = new Map<string, { labels: string[]; next: number; lists: Map<string, { point: ChoicePoint; option: number }[]> }>();
  for (const [citizen, labels] of [...byCitizen.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const lists = new Map<string, { point: ChoicePoint; option: number }[]>();
    for (const [label, pts] of [...labels.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const order = vanDerCorputOrder(pts.length).map((i) => pts[i] as ChoicePoint);
      const maxAlternatives = Math.max(...order.map((p) => p.options.length - 1));
      const list: { point: ChoicePoint; option: number }[] = [];
      for (let k = 0; k < maxAlternatives; k++) {
        for (const point of order) {
          const alternatives = [...point.options.keys()].filter((o) => o !== point.chosen);
          const option = alternatives[k];
          if (option !== undefined) list.push({ point, option });
        }
      }
      lists.set(label, list);
    }
    queues.set(citizen, { labels: [...lists.keys()], next: 0, lists });
  }
  const out: Alternative[] = [];
  let pass = 0;
  while (out.length < budget) {
    pass++;
    let took = false;
    for (const [, q] of queues) {
      if (out.length >= budget) break;
      // rotate over this citizen's kinds of choice; skip exhausted ones
      for (let tries = 0; tries < q.labels.length; tries++) {
        const label = q.labels[(q.next + tries) % q.labels.length] as string;
        const list = q.lists.get(label) as { point: ChoicePoint; option: number }[];
        const item = list.shift();
        if (!item) continue;
        q.next = (q.next + tries + 1) % q.labels.length;
        out.push({ ...item, rank: out.length + 1, pass });
        took = true;
        break;
      }
    }
    if (!took) break;
  }
  return out;
}
