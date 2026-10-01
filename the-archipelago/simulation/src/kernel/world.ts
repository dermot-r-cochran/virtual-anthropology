import { canonicalJson, GENESIS_HASH, sha256Hex } from "./canonical.js";
import { CommandSchema, type Command } from "./commands.js";
import { createDecideContext, decide, decideResearch } from "./decide.js";
import { RecordedEventSchema, type DomainEvent, type RecordedEvent } from "./events.js";
import { checkInvariants } from "./invariants.js";
import { applyRecorded } from "./reducer.js";
import { ActorSchema, formatId, type Actor } from "../domain/ids.js";
import { WorldStateSchema, type PolicyRef, type WorldState } from "../domain/model.js";
import { evaluate, type PolicyDecision, type PolicyStage } from "../policy/evaluate.js";

export type RejectionStage = "schema" | PolicyStage;

export type ExecutionResult =
  | { status: "applied"; commandId: string; command: Command; decision: PolicyDecision; events: readonly RecordedEvent[] }
  | { status: "rejected"; commandId: string | null; stage: RejectionStage; reasons: readonly string[]; events: readonly RecordedEvent[] };

export interface WorldOptions {
  /** Check state invariants after every command (default true). */
  readonly checkInvariants?: boolean;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

function hashRecord(rec: Omit<RecordedEvent, "hash">): string {
  return sha256Hex(rec.prevHash + canonicalJson({ ...rec, prevHash: undefined }));
}

/**
 * The deterministic simulation kernel. The append-only, hash-chained event log
 * is the single source of truth; `state` is a projection of it. Only validated
 * commands can append events.
 */
export class World {
  #state: WorldState;
  readonly #log: RecordedEvent[];
  readonly #check: boolean;

  private constructor(state: WorldState, log: RecordedEvent[], options: WorldOptions) {
    this.#state = deepFreeze(state);
    this.#log = log;
    this.#check = options.checkInvariants ?? true;
  }

  /** Founds a new world from a genesis state. The genesis state is the first event. */
  static found(genesis: WorldState, scenario: string, options: WorldOptions = {}): World {
    const state = WorldStateSchema.parse(genesis);
    if (state.seq !== 0 || state.tick !== 0) throw new Error("genesis state must start at seq 0, tick 0");
    const violations = checkInvariants(state);
    if (violations.length > 0) throw new Error(`genesis violates invariants:\n${violations.join("\n")}`);
    const world = new World(state, [], options);
    world.#append({ kind: "system", id: "genesis" }, null, null, { type: "WorldFounded", state, scenario });
    return world;
  }

  /** Rebuilds a world from a log, verifying schema, sequence and hash chain. */
  static replay(log: readonly unknown[], options: WorldOptions = {}): World {
    if (log.length === 0) throw new Error("cannot replay an empty log");
    let state: WorldState | null = null;
    const records: RecordedEvent[] = [];
    let prev = GENESIS_HASH;
    log.forEach((raw, i) => {
      const rec = RecordedEventSchema.parse(raw);
      if (rec.seq !== i) throw new Error(`log integrity: expected seq ${i}, found ${rec.seq}`);
      if (rec.prevHash !== prev) throw new Error(`log integrity: broken chain at seq ${i}`);
      const { hash, ...rest } = rec;
      if (hashRecord(rest) !== hash) throw new Error(`log integrity: hash mismatch at seq ${i}`);
      if (i === 0 && rec.event.type !== "WorldFounded") throw new Error("log must begin with WorldFounded");
      state = applyRecorded(state ?? (undefined as unknown as WorldState), rec);
      records.push(rec);
      prev = hash;
    });
    return new World(state as unknown as WorldState, records, options);
  }

  /** The current canonical world state (deeply frozen). */
  get state(): WorldState {
    return this.#state;
  }

  get log(): readonly RecordedEvent[] {
    return this.#log;
  }

  get headHash(): string {
    return this.#log[this.#log.length - 1]?.hash ?? GENESIS_HASH;
  }

  /** Reconstructs the state as it was immediately after event `seq`. */
  stateAt(seq: number): WorldState {
    if (seq < 0 || seq >= this.#log.length) throw new RangeError(`no event at seq ${seq}`);
    let state = undefined as unknown as WorldState;
    for (let i = 0; i <= seq; i++) state = applyRecorded(state, this.#log[i] as RecordedEvent);
    return state;
  }

  /**
   * Validates and executes a command. Rejections (other than while paused) are
   * recorded in the history as `CommandRejected` facts so that refused actions,
   * including invalid model output, remain observable to researchers.
   */
  execute(actor: Actor, input: unknown): ExecutionResult {
    const who = ActorSchema.parse(actor);
    const state = this.#state;
    const inputType = typeof input === "object" && input !== null && "type" in input ? String((input as { type: unknown }).type) : "unknown";
    if (state.paused && inputType !== "ResumeSimulation") {
      return { status: "rejected", commandId: null, stage: "precondition", reasons: ["simulation is paused"], events: [] };
    }
    const commandId = formatId("command", (state.counters.command ?? 0) + 1);
    const parsed = CommandSchema.safeParse(input);
    if (!parsed.success) {
      const reasons = parsed.error.issues.slice(0, 10).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
      const rec = this.#append(who, commandId, null, { type: "CommandRejected", commandType: inputType.slice(0, 60), stage: "schema", reasons });
      return { status: "rejected", commandId, stage: "schema", reasons, events: [rec] };
    }
    const command = parsed.data;
    const decision = evaluate(state, who, command);
    const policy: PolicyRef = {
      jurisdiction: decision.jurisdiction,
      lawVersion: decision.lawVersion,
      citations: decision.citations,
      findings: decision.findings,
    };
    if (!decision.allowed) {
      const rec = this.#append(who, commandId, policy, { type: "CommandRejected", commandType: command.type, stage: decision.stage, reasons: decision.findings });
      return { status: "rejected", commandId, stage: decision.stage, reasons: decision.findings, events: [rec] };
    }
    const ctx = createDecideContext(state);
    const domainEvents =
      command.type === "ResearcherIntervention" || command.type === "RecordConversation"
        ? decideResearch(command, who.id, ctx)
        : decide(state, command, ctx);
    const records = domainEvents.map((e) => this.#append(who, commandId, policy, e));
    if (this.#check) {
      const violations = checkInvariants(this.#state);
      if (violations.length > 0) throw new Error(`invariant violation after ${command.type}:\n${violations.join("\n")}`);
    }
    return { status: "applied", commandId, command, decision, events: records };
  }

  #append(actor: Actor, commandId: string | null, policy: PolicyRef | null, event: DomainEvent): RecordedEvent {
    const seq = this.#log.length;
    const body = { seq, tick: this.#state?.tick ?? 0, actor, commandId, policy, event, prevHash: this.headHash };
    const rec = RecordedEventSchema.parse({ ...body, hash: hashRecord(body) });
    this.#state = deepFreeze(applyRecorded(this.#state, rec));
    this.#log.push(deepFreeze(rec));
    return rec;
  }
}
