import type { AgentRuntime } from "../agents/runtime.js";
import type { CitizenId } from "../domain/ids.js";
import type { InterventionSpec, Memory, WorldState } from "../domain/model.js";
import { ancestorsOf } from "../kernel/invariants.js";
import type { ExecutionResult, World } from "../kernel/world.js";
import { guardReply } from "../policy/disclosure.js";

export interface ConversationResult {
  readonly reply: string;
  readonly flags: readonly string[];
  readonly blocked: boolean;
  readonly recorded: ExecutionResult;
}

/**
 * The human-researcher interface. Researchers may observe, configure (via the
 * manifest at genesis), introduce bounded interventions, converse with
 * citizens, inspect provenance, pause the simulation and export histories.
 * Every write goes through the kernel and is recorded in the history.
 */
export class ResearcherSession {
  constructor(
    readonly researcherId: string,
    private readonly world: World,
    private readonly runtime: AgentRuntime | null = null,
  ) {}

  private get actor() {
    return { kind: "researcher" as const, id: this.researcherId };
  }

  /** Read-only, deeply frozen view of the canonical state. */
  observe(): WorldState {
    return this.world.state;
  }

  inspectMemory(memoryId: string): Memory {
    const m = this.world.state.memories[memoryId];
    if (!m) throw new Error(`unknown memory ${memoryId}`);
    return structuredClone(m);
  }

  inspectCitizen(id: CitizenId) {
    const s = this.world.state;
    const c = s.citizens[id];
    if (!c) throw new Error(`unknown citizen ${id}`);
    const memories = [...c.selfNarrativeMemories, ...c.heldMemories].map((mid) => structuredClone(s.memories[mid] as Memory));
    return {
      citizen: structuredClone(c),
      mindProvenance: structuredClone(c.provenance),
      ancestors: [...ancestorsOf(s, id)].sort(),
      memories,
      cognition: this.runtime?.cognitionOf(id) ?? null,
    };
  }

  pause(reason: string): ExecutionResult {
    return this.world.execute(this.actor, { type: "PauseSimulation", reason });
  }

  resume(reason: string): ExecutionResult {
    return this.world.execute(this.actor, { type: "ResumeSimulation", reason });
  }

  advance(ticks: number): ExecutionResult {
    return this.world.execute(this.actor, { type: "AdvanceTime", ticks });
  }

  intervene(spec: InterventionSpec, justification: string): ExecutionResult {
    return this.world.execute(this.actor, { type: "ResearcherIntervention", spec, justification });
  }

  /**
   * Converses with a citizen. The reply is produced by the citizen's mind,
   * passed through the disclosure / anti-manipulation guard, and recorded.
   */
  async converse(citizenId: CitizenId, utterance: string): Promise<ConversationResult> {
    if (!this.runtime) throw new Error("conversation requires an agent runtime");
    const mind = this.runtime.mindOf(citizenId);
    if (!mind) throw new Error(`no mind attached for ${citizenId}`);
    const obs = this.runtime.observation(citizenId);
    const cog = this.runtime.cognitionOf(citizenId);
    if (!cog) throw new Error(`no cognitive state for ${citizenId}`);
    const raw = await mind.respond(utterance, obs, cog);
    const guarded = guardReply(raw);
    const recorded = this.world.execute(this.actor, {
      type: "RecordConversation",
      citizen: citizenId,
      researcherUtterance: utterance,
      citizenReply: guarded.reply,
      guardFlags: guarded.flags,
    });
    return { ...guarded, recorded };
  }

  /** The full event history as JSON lines. */
  exportHistory(): string {
    return this.world.log.map((e) => JSON.stringify(e)).join("\n") + "\n";
  }
}
