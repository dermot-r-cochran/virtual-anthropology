import { sha256Hex } from "../kernel/canonical.js";
import type { CitizenId } from "../domain/ids.js";
import type { MindProvenance } from "../domain/model.js";
import type { ActionProposal, CitizenMind, CognitiveState, MindContext, Observation } from "./types.js";

/**
 * Adapter for language-model-driven citizens. A model may generate dialogue or
 * propose actions, but its output is untrusted text: proposals are parsed into
 * candidates and must pass schema validation, authorisation and island law in
 * the kernel. Dialogue passes the disclosure / non-manipulation guard.
 *
 * No client is bundled; supply one that wraps your provider. Model calls are
 * not deterministic, so runs using this mind record the model provenance and
 * are reproducible only by replaying the recorded event log.
 */
export interface ModelClient {
  readonly model: string;
  readonly modelVersion: string;
  complete(request: { system: string; prompt: string }): Promise<string>;
}

export const LLM_PROMPT_ID = "archipelago/llm-citizen/v1";

export const LLM_SYSTEM_PROMPT = [
  "You generate proposals and dialogue for a simulated digital person in The Archipelago, a research simulation.",
  "The character is artificial. When addressing humans it must say that it is a simulated digital person.",
  "Never claim to be human or conscious. Never pressure anyone to keep talking or to return.",
  'To act, reply with JSON only: {"proposals":[{"command":{...},"rationale":"..."}]}.',
  "Commands are requests; the world's laws decide whether they take effect.",
].join("\n");

export class LanguageModelMind implements CitizenMind {
  readonly provenance: MindProvenance;

  constructor(
    readonly citizenId: CitizenId,
    private readonly client: ModelClient,
    seed: string,
  ) {
    this.provenance = {
      kind: "language-model",
      model: client.model,
      modelVersion: client.modelVersion,
      promptId: LLM_PROMPT_ID,
      promptHash: sha256Hex(LLM_SYSTEM_PROMPT),
      seed,
    };
  }

  async propose(obs: Observation, _cog: CognitiveState, ctx: MindContext): Promise<ActionProposal[]> {
    const raw = await this.client.complete({ system: LLM_SYSTEM_PROMPT, prompt: renderObservation(obs, ctx) });
    return parseProposals(raw).map((p) => ({ proposer: this.citizenId, candidate: p.candidate, rationale: p.rationale, generator: this.provenance }));
  }

  async respond(utterance: string, obs: Observation): Promise<string> {
    return this.client.complete({
      system: LLM_SYSTEM_PROMPT,
      prompt: `You are ${obs.self.name}. A human researcher says: ${JSON.stringify(utterance)}. Reply in plain text.`,
    });
  }
}

export function renderObservation(obs: Observation, ctx: MindContext): string {
  return JSON.stringify({
    beat: ctx.beat,
    tick: obs.tick,
    self: { id: obs.self.id, name: obs.self.name, residence: obs.self.residence, occupation: obs.self.occupation, goals: obs.self.goals, values: obs.self.values },
    law: { island: obs.residenceLaw.island, version: obs.residenceLaw.version, doctrine: obs.residenceLaw.doctrine },
    kin: obs.kin,
    openProposals: obs.openProposals.map((p) => ({ id: p.id, title: p.title })),
    messages: obs.messages,
  });
}

/** Parses model output into untrusted candidates. Malformed output becomes an explicit invalid candidate. */
export function parseProposals(raw: string): Array<{ candidate: unknown; rationale: string }> {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [{ candidate: { type: "UnparseableModelOutput" }, rationale: "model output was not valid JSON" }];
  }
  const list = (data as { proposals?: unknown }).proposals;
  if (!Array.isArray(list)) return [{ candidate: { type: "UnparseableModelOutput" }, rationale: "missing proposals array" }];
  return list.slice(0, 5).map((p) => ({
    candidate: (p as { command?: unknown }).command ?? null,
    rationale: String((p as { rationale?: unknown }).rationale ?? "").slice(0, 500),
  }));
}
