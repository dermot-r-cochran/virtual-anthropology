import type { CitizenId } from "../domain/ids.js";

/**
 * A recorded choice: where a mind had more than one option and took one.
 * The default is always the first option in canonical order; nothing is
 * drawn at random anywhere in the simulation. Every alternative is a branch
 * a study may take, identified by (seq, citizen, label, occurrence).
 */
export interface ChoicePoint {
  readonly seq: number;
  readonly citizen: CitizenId;
  readonly label: string;
  /** Ordinal among choices with the same seq, citizen and label (0 for the first). */
  readonly occurrence: number;
  readonly options: readonly string[];
  readonly chosen: number;
}

/** An override of one choice point: take `option` instead of the default. */
export interface Flip {
  readonly seq: number;
  readonly citizen: CitizenId;
  readonly label: string;
  readonly occurrence?: number;
  readonly option: number;
}

export const choiceKey = (seq: number, citizen: string, label: string, occurrence: number): string => `${seq}:${citizen}:${label}#${occurrence}`;

/** The choice a mind is offered at one point: options in canonical order, and how to describe them in the record. */
export type Choose = <T>(label: string, options: readonly T[], describe?: (option: T) => string) => T;

/**
 * Records every choice point of a run and applies declared flips. A flip
 * whose point never occurs (because an earlier flip changed the course of
 * events) is reported by `unusedFlips`, so a branch can say it was moot.
 */
export class ChoiceLog {
  readonly points: ChoicePoint[] = [];
  readonly #counts = new Map<string, number>();
  readonly #overrides = new Map<string, number>();
  readonly #used = new Set<string>();

  constructor(flips: readonly Flip[] = []) {
    for (const f of flips) this.#overrides.set(choiceKey(f.seq, f.citizen, f.label, f.occurrence ?? 0), f.option);
  }

  /** Binds the log to one mind at one observation. */
  at(seq: number, citizen: CitizenId): Choose {
    return (label, options, describe = (o) => String(o)) => this.choose(seq, citizen, label, options, describe);
  }

  choose<T>(seq: number, citizen: CitizenId, label: string, options: readonly T[], describe: (option: T) => string): T {
    if (options.length === 0) throw new RangeError(`choice ${label} at seq ${seq} for ${citizen} has no options`);
    const base = `${seq}:${citizen}:${label}`;
    const occurrence = this.#counts.get(base) ?? 0;
    this.#counts.set(base, occurrence + 1);
    const key = `${base}#${occurrence}`;
    let chosen = 0;
    const override = this.#overrides.get(key);
    if (override !== undefined) {
      if (!Number.isInteger(override) || override < 0 || override >= options.length) throw new RangeError(`flip ${key}: option ${override} is not one of ${options.length}`);
      chosen = override;
      this.#used.add(key);
    }
    this.points.push({ seq, citizen, label, occurrence, options: options.map(describe), chosen });
    return options[chosen] as T;
  }

  /** Flips declared for points that never occurred. */
  unusedFlips(): string[] {
    return [...this.#overrides.keys()].filter((k) => !this.#used.has(k)).sort();
  }
}
