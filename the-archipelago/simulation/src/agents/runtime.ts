import type { CitizenId } from "../domain/ids.js";
import { canAct } from "../domain/lifecycle.js";
import type { World } from "../kernel/world.js";
import { initialCognition, observe, updateCognition } from "./observe.js";
import type { ActionProposal, CitizenMind, CognitiveState, Observation } from "./types.js";

export interface ProposalRecord {
  readonly beat: string;
  readonly proposer: CitizenId;
  readonly rationale: string;
  readonly generator: ActionProposal["generator"];
  readonly outcome: "applied" | "rejected";
  readonly commandId: string | null;
  readonly reasons: readonly string[];
}

/**
 * Hosts minds and routes their proposals to the kernel. This is the only path
 * from model output to world change; a proposal always executes as its mind's
 * own citizen, so a mind cannot impersonate another actor.
 */
export class AgentRuntime {
  readonly proposals: ProposalRecord[] = [];
  readonly #minds = new Map<CitizenId, CitizenMind>();
  readonly #cognition = new Map<CitizenId, CognitiveState>();

  constructor(readonly world: World) {}

  attach(mind: CitizenMind): void {
    if (!this.world.state.citizens[mind.citizenId]) throw new Error(`no citizen ${mind.citizenId}`);
    this.#minds.set(mind.citizenId, mind);
    if (!this.#cognition.has(mind.citizenId)) this.#cognition.set(mind.citizenId, initialCognition(mind.citizenId));
  }

  mindOf(id: CitizenId): CitizenMind | undefined {
    return this.#minds.get(id);
  }

  cognitionOf(id: CitizenId): CognitiveState | undefined {
    const c = this.#cognition.get(id);
    return c ? structuredClone(c) : undefined;
  }

  observation(id: CitizenId): Observation {
    const cog = this.#cognition.get(id) ?? initialCognition(id);
    return observe(this.world.state, this.world.log, id, cog.lastSeenSeq);
  }

  /** Lets each (or each listed) active citizen perceive and propose, in id order. */
  async step(beat: string, only?: readonly CitizenId[]): Promise<ProposalRecord[]> {
    const ids = [...this.#minds.keys()].filter((id) => !only || only.includes(id)).sort();
    const out: ProposalRecord[] = [];
    for (const id of ids) out.push(...(await this.stepAgent(beat, id)));
    return out;
  }

  /** The ids of all hosted minds, sorted. */
  agentIds(): CitizenId[] {
    return [...this.#minds.keys()].sort();
  }

  /** One perceive → deliberate → propose → validate cycle for a single agent. */
  async stepAgent(beat: string, id: CitizenId): Promise<ProposalRecord[]> {
    const citizen = this.world.state.citizens[id];
    const mind = this.#minds.get(id);
    if (!mind || !citizen || !canAct(citizen.lifecycle)) return [];
    const obs = this.observation(id);
    let cog = updateCognition(this.#cognition.get(id) ?? initialCognition(id), obs);
    if (mind.deliberate) cog = mind.deliberate(obs, structuredClone(cog), { beat });
    const proposals = await mind.propose(obs, structuredClone(cog), { beat });
    const out = proposals.map((p) => this.submit(mind, p, beat));
    const [first, ...rest] = cog.intentions;
    if (first && out.length > 0) {
      // An applied plan achieves the intention; a rejected one counts as a failed attempt.
      const achieved = out.some((r) => r.outcome === "applied");
      cog = { ...cog, intentions: achieved ? rest : [{ ...first, attempts: first.attempts + 1 }, ...rest] };
    }
    this.#cognition.set(id, cog);
    return out;
  }

  private submit(mind: CitizenMind, p: ActionProposal, beat: string): ProposalRecord {
    const result = this.world.execute({ kind: "citizen", id: mind.citizenId }, p.candidate);
    const record: ProposalRecord = {
      beat,
      proposer: mind.citizenId,
      rationale: p.rationale,
      generator: mind.provenance,
      outcome: result.status,
      commandId: result.commandId,
      reasons: result.status === "rejected" ? result.reasons : [],
    };
    this.proposals.push(record);
    return record;
  }
}
