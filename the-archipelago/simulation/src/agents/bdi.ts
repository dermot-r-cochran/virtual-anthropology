import { roomNames } from "../domain/geography.js";
import type { MindProvenance } from "../domain/model.js";
import type { Rng } from "../kernel/rng.js";
import { deterministicReply } from "./deterministic.js";
import type { ActionProposal, CitizenMind, CognitiveState, Desire, DesireKind, Intention, MindContext, Observation } from "./types.js";

/**
 * A deterministic Belief–Desire–Intention agent.
 *
 *   beliefs    ← revised from the scoped observation and episodic memory
 *   desires    ← options generated from goals, values, law and circumstances
 *   intentions ← deliberation: keep a committed intention while it remains
 *                feasible (single-minded commitment); it is dropped once the
 *                kernel applies its plan, or after MAX_ATTEMPTS rejections;
 *                otherwise adopt the highest-priority desire
 *   plan       ← a plan library maps each intention to one candidate command
 *
 * The plan output is only a proposal; the kernel validates it. The agent acts
 * only in "interlude" beats so scripted scenario beats remain controlled.
 */

const MAX_ATTEMPTS = 2;

const ACTIVITIES = ["walked", "mapped", "repaired a lantern at", "argued about tides at", "kept watch over", "taught a class at"];
const CHRONICLER = /registrar|archivist|historian|chronicler/;
const CULTURAL = /poet|historian|singer|cartographer|builder|mediator/;

const v = (obs: Observation, axis: string): number => obs.self.values[axis] ?? 0;

/** Belief revision: derives propositions from observation and episodic memory. */
export function reviseBeliefs(cog: CognitiveState, obs: Observation): Record<string, string> {
  const lived = obs.episodes.filter((e) => e.source === "lived");
  const latest = lived.at(-1);
  return {
    ...cog.beliefs,
    residence: obs.self.residence,
    doctrine: obs.residenceLaw.continuityDoctrine,
    lifecycle: obs.self.lifecycle,
    memoryExchange: obs.residenceLaw.memoryExchange,
    integration: obs.residenceLaw.importedMemoryIntegration,
    openBallots: String(obs.openProposals.filter((p) => p.electorate.includes(obs.self.id) && !(obs.self.id in p.votes)).length),
    kinCount: String(obs.kin.length),
    lastLivedEpisode: latest ? `${latest.memoryId}@${latest.when}` : "none",
    newEventsSinceLastStep: String(obs.recentEventSeqs.length),
  };
}

/** Option generation: what the agent could want now, with priorities. */
export function generateDesires(obs: Observation, rng: Rng): Desire[] {
  const s = obs.self;
  const out: Desire[] = [];
  const jitter = () => Math.round(rng.next() * 100) / 1000; // ≤ 0.1, seeded
  const ballot = obs.openProposals.find((p) => p.electorate.includes(s.id) && !(s.id in p.votes) && obs.tick < p.closesAtTick);
  if (ballot) out.push({ kind: "participate-in-governance", priority: 1 + v(obs, "autonomy") * 0.1 + v(obs, "communality") * 0.1, target: ballot.id });
  if (obs.kin.length > 0) {
    const k = rng.pick(obs.kin);
    out.push({ kind: "maintain-relationships", priority: 0.3 + v(obs, "communality") * 0.3 + jitter(), target: k.id });
  }
  out.push({ kind: "record-experience", priority: 0.35 + v(obs, "curiosity") * 0.2 + jitter(), target: null });
  out.push({ kind: "create-culture", priority: 0.2 + v(obs, "novelty") * 0.2 + (CULTURAL.test(s.occupation) ? 0.1 : 0) + jitter(), target: null });
  if (obs.residenceLaw.memoryExchange === "permitted") {
    const candidate = obs.archiveCatalogue.find((a) => a.contributedBy !== s.id && !a.alreadyHeld);
    if (candidate) out.push({ kind: "explore-collective-memory", priority: 0.25 + v(obs, "curiosity") * 0.3 + jitter(), target: candidate.id });
  }
  if (obs.residenceLaw.importedMemoryIntegration === "explicit-act") {
    const imported = obs.episodes.find((e) => e.source === "imported");
    if (imported) out.push({ kind: "integrate-memory", priority: 0.1 + v(obs, "communality") * 0.2 + jitter(), target: imported.memoryId });
  }
  if (CHRONICLER.test(s.occupation) && obs.recentEventSeqs.length >= 3) {
    out.push({ kind: "keep-chronicle", priority: 0.45 + v(obs, "tradition") * 0.2 + jitter(), target: null });
  }
  return out.sort((a, b) => b.priority - a.priority || a.kind.localeCompare(b.kind));
}

function stillFeasible(i: Intention, desires: readonly Desire[]): boolean {
  return i.attempts < MAX_ATTEMPTS && desires.some((d) => d.kind === i.kind && d.target === i.target);
}

/** Deliberation with single-minded commitment. */
export function deliberate(cog: CognitiveState, obs: Observation, rng: Rng): CognitiveState {
  const beliefs = reviseBeliefs(cog, obs);
  const desires = generateDesires(obs, rng);
  const kept = cog.intentions.filter((i) => stillFeasible(i, desires));
  const top = desires[0];
  const intentions: Intention[] =
    kept.length > 0 ? kept.slice(0, 1) : top ? [{ kind: top.kind, target: top.target, adoptedAtSeq: obs.seq, attempts: 0 }] : [];
  return { ...cog, beliefs, desires, intentions };
}

/** Plan library: one candidate command per intention kind. */
export function plan(intention: Intention, obs: Observation, rng: Rng): { candidate: unknown; rationale: string } | null {
  const s = obs.self;
  const place = rng.pick(roomNames(s.residence));
  const why = (kind: DesireKind) => `BDI intention ${kind}${intention.target ? ` → ${intention.target}` : ""}`;
  switch (intention.kind) {
    case "participate-in-governance": {
      const lean = v(obs, "novelty") + v(obs, "autonomy") - v(obs, "caution") - v(obs, "tradition");
      return { candidate: { type: "CastVote", proposalId: intention.target, voter: s.id, choice: lean >= 0 ? "yes" : "no" }, rationale: `${why(intention.kind)}; values lean ${lean.toFixed(2)}` };
    }
    case "maintain-relationships": {
      const k = obs.kin.find((x) => x.id === intention.target);
      return { candidate: { type: "Endorse", by: s.id, subject: intention.target, delta: 1, reason: `appreciation for ${k?.name ?? intention.target}` }, rationale: why(intention.kind) };
    }
    case "record-experience":
      return {
        candidate: { type: "RecordExperience", citizen: s.id, content: `${s.name} ${rng.pick(ACTIVITIES)} ${place} at tick ${obs.tick}.`, tags: ["everyday", s.residence] },
        rationale: why(intention.kind),
      };
    case "create-culture": {
      const kind = rng.pick(["poem", "song", "essay"] as const);
      const echo = obs.episodes.filter((e) => e.autobiographical && e.what).at(-1);
      return {
        candidate: {
          type: "CreateArtefact",
          authors: [s.id],
          island: s.residence,
          kind,
          title: `${/^[aeiou]/.test(kind) ? "An" : "A"} ${kind} of ${place}`,
          body: `Composed by ${s.name}, ${s.occupation}, about ${place} (tick ${obs.tick}).${echo ? ` It recalls: "${echo.what}"` : ""}`,
        },
        rationale: why(intention.kind),
      };
    }
    case "explore-collective-memory":
      return { candidate: { type: "ImportMemory", citizen: s.id, memoryId: intention.target }, rationale: why(intention.kind) };
    case "integrate-memory":
      return { candidate: { type: "IntegrateMemory", citizen: s.id, memoryId: intention.target }, rationale: why(intention.kind) };
    case "keep-chronicle":
      return {
        candidate: {
          type: "RecordChronicle",
          chronicler: s.id,
          island: s.residence,
          text: `${s.name} notes ${obs.recentEventSeqs.length} recent events touching their work on ${s.residence}.`,
          references: obs.recentEventSeqs.slice(-5),
        },
        rationale: why(intention.kind),
      };
  }
}

export class BdiMind implements CitizenMind {
  constructor(
    readonly citizenId: string,
    readonly provenance: MindProvenance,
    private readonly rng: Rng,
  ) {}

  deliberate(obs: Observation, cog: CognitiveState, ctx: MindContext): CognitiveState {
    if (ctx.beat !== "interlude") return { ...cog, beliefs: reviseBeliefs(cog, obs) };
    return deliberate(cog, obs, this.rng.derive(`deliberate/${obs.seq}`));
  }

  propose(obs: Observation, cog: CognitiveState, ctx: MindContext): ActionProposal[] {
    if (ctx.beat !== "interlude") return [];
    const intention = cog.intentions[0];
    if (!intention) return [];
    const p = plan(intention, obs, this.rng.derive(`plan/${obs.seq}`));
    return p ? [{ proposer: this.citizenId, candidate: p.candidate, rationale: p.rationale, generator: this.provenance }] : [];
  }

  respond(utterance: string, obs: Observation): string {
    return deterministicReply(utterance, obs);
  }
}
