import { describe, expect, it } from "vitest";
import type { ChoicePoint } from "../src/agents/choice.js";
import { fairEnumeration, vanDerCorputOrder } from "../src/research/enumeration.js";

const point = (seq: number, citizen: string, label: string, options: number, occurrence = 0): ChoicePoint => ({
  seq, citizen, label, occurrence, options: Array.from({ length: options }, (_, i) => `${label}${i}`), chosen: 0,
});

describe("the branch sweep's declared order", () => {
  it("visits positions in van der Corput (bit-reversed) order, spread across the span", () => {
    expect(vanDerCorputOrder(8)).toEqual([0, 4, 2, 6, 1, 5, 3, 7]);
    expect(vanDerCorputOrder(5)).toEqual([0, 4, 2, 1, 3]);
    expect(vanDerCorputOrder(1)).toEqual([0]);
    expect(vanDerCorputOrder(0)).toEqual([]);
  });

  it("is fair across citizens, rotates kinds within a citizen, and takes alternatives one per visit in canonical order", () => {
    const points: ChoicePoint[] = [];
    for (const c of ["cit-0003", "cit-0001", "cit-0002"]) for (const label of ["place", "kin"]) for (let i = 0; i < 8; i++) points.push(point(100 + i * 10, c, label, 3));
    const alts = fairEnumeration(points, 12);
    expect(alts.map((a) => a.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // pass 1: one alternative per citizen, citizens in identifier order, each citizen's first kind (kin sorts before place)
    expect(alts.slice(0, 3).map((a) => [a.pass, a.point.citizen, a.point.label])).toEqual([[1, "cit-0001", "kin"], [1, "cit-0002", "kin"], [1, "cit-0003", "kin"]]);
    // pass 2: the other kind for each citizen
    expect(alts.slice(3, 6).map((a) => [a.pass, a.point.citizen, a.point.label])).toEqual([[2, "cit-0001", "place"], [2, "cit-0002", "place"], [2, "cit-0003", "place"]]);
    // within one citizen and kind, points are visited at van der Corput positions: 0, 4, 2, 6, …
    const kinOfOne = alts.filter((a) => a.point.citizen === "cit-0001" && a.point.label === "kin").map((a) => a.point.seq);
    expect(kinOfOne).toEqual([100, 140]);
    // the first alternative of a point is option 1 (the first non-default in canonical order)
    expect(alts.every((a) => a.option === 1)).toBe(true);
  });

  it("skips points with a single option, takes second alternatives only after every point's first, and stops when the space is exhausted", () => {
    const points = [point(1, "a", "x", 1), point(2, "a", "x", 3), point(3, "a", "x", 2)];
    const alts = fairEnumeration(points, 10);
    expect(alts.map((a) => [a.point.seq, a.option])).toEqual([[2, 1], [3, 1], [2, 2]]);
    expect(alts).toHaveLength(3);
  });
});
