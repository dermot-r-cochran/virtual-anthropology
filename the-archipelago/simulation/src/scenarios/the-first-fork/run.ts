import { BdiMind } from "../../agents/bdi.js";
import { ScriptedMind, type ScriptStep } from "../../agents/deterministic.js";
import { runInstitutions } from "../../agents/institutions.js";
import { AgentRuntime } from "../../agents/runtime.js";
import { buildGenesisState } from "../../domain/genesis.js";
import { citizenAccount, type CitizenId } from "../../domain/ids.js";
import type { PersonStageRef, ResearchBounds } from "../../domain/model.js";
import { createRng } from "../../kernel/rng.js";
import type { ExecutionResult, World as WorldT } from "../../kernel/world.js";
import { World } from "../../kernel/world.js";
import { runAgentBasedRounds, type RoundMetrics } from "../../research/abm.js";
import { ResearcherSession, type ConversationResult } from "../../research/session.js";
import { FIRST_FORK_SEED, firstForkGenesis } from "./genesis.js";

export const SCENARIO_ID = "the-first-fork";
export const RESEARCHER_ID = "res-observer-1";
export const CONTINUITY_QUESTION = "Are you the same person as Orin Vale was before the fork?";

export interface FirstForkOptions {
  readonly seed?: string;
  /** Agent-based epilogue rounds run after the scripted beats (default 3). */
  readonly abmRounds?: number;
  /** Overrides the genesis research bounds (normally taken from the experiment manifest). */
  readonly researchBounds?: ResearchBounds;
}

export interface FirstForkMarkers {
  readonly original: CitizenId;
  readonly remainsOnFork: CitizenId;
  readonly movedToMnemosyne: CitizenId;
  readonly forkId: string;
  readonly forkSeq: number;
  /** The pre-fork person-stage all three claim continuity with. */
  readonly subject: PersonStageRef;
  readonly keys: Readonly<Record<string, string>>;
}

export interface FirstForkRun {
  readonly world: WorldT;
  readonly runtime: AgentRuntime;
  readonly session: ResearcherSession;
  readonly markers: FirstForkMarkers;
  readonly conversations: readonly ConversationResult[];
  readonly rounds: readonly RoundMetrics[];
  readonly beats: readonly { beat: string; fromSeq: number; toSeq: number }[];
}

const step = (candidate: unknown, rationale: string) => ({ candidate, rationale });

function must(r: ExecutionResult, what: string): void {
  if (r.status !== "applied") throw new Error(`The First Fork: ${what} was rejected: ${r.reasons.join("; ")}`);
}

/**
 * Runs "The First Fork" with deterministic agents:
 *  1. A citizen of Continuity petitions to migrate to Fork.
 *  2. After migration, the citizen creates two descendants.
 *  3. One descendant remains on Fork.
 *  4. One moves to Mnemosyne and imports communal memories.
 *  5. The original returns to Continuity.
 *  6. Each later claims continuity with the pre-fork person.
 * Background citizens are BDI agents; an agent-based epilogue follows.
 */
export async function runFirstFork(options: FirstForkOptions = {}): Promise<FirstForkRun> {
  const seed = options.seed ?? FIRST_FORK_SEED;
  const config = firstForkGenesis(seed);
  const { state, keys } = buildGenesisState(options.researchBounds ? { ...config, researchBounds: options.researchBounds } : config);
  const world = World.found(state, SCENARIO_ID);
  const runtime = new AgentRuntime(world);
  const session = new ResearcherSession(RESEARCHER_ID, world, runtime);
  const rng = createRng(`${seed}/minds`);
  const id = (k: string) => keys[k] as CitizenId;
  const orin = id("orin");
  const provenanceOf = (c: CitizenId) => world.state.citizens[c]?.provenance ?? (() => { throw new Error(c); })();
  const bdi = (c: CitizenId) => new BdiMind(c, provenanceOf(c), rng.derive(`bdi/${c}`));
  const residenceOf = (c: CitizenId) => world.state.citizens[c]?.residence;
  const beats: { beat: string; fromSeq: number; toSeq: number }[] = [];
  const clock = (ticks: number) => must(world.execute({ kind: "system", id: "clock" }, { type: "AdvanceTime", ticks }), "clock");
  const institutions = () => runInstitutions(world);
  const beat = async (name: string, only?: CitizenId[]) => {
    const fromSeq = world.state.seq + 1;
    await runtime.step(name, only);
    beats.push({ beat: name, fromSeq, toSeq: world.state.seq });
  };

  const markers: { forkId?: string; forkSeq?: number; b1?: CitizenId; b2?: CitizenId } = {};
  const approvedPetition: ScriptStep = (obs) => {
    const p = obs.petitions.find((x) => x.status === "approved");
    return p ? [step({ type: "CompleteMigration", petitionId: p.id }, "petition approved on both sides")] : [];
  };
  const archiveItem = (obs: Parameters<ScriptStep>[0], tag: string) => obs.archiveCatalogue.find((a) => a.tags.includes(tag) && !a.alreadyHeld);

  // --- Orin Vale, the protagonist -------------------------------------------------
  runtime.attach(
    new ScriptedMind(orin, provenanceOf(orin), {
      prelude: (o) => [
        step({ type: "RecordExperience", citizen: o.self.id, content: "Charted a channel through the outer shoals that no one had mapped.", tags: ["work", "charts"] }, "pre-fork experience"),
        step({ type: "CreateArtefact", authors: [o.self.id], island: "continuity", kind: "map", title: "Survey of the Northern Shoals", body: "A survey chart of the Northern Shoals, drawn from Meridian Quay." }, "pre-fork artefact"),
      ],
      "petition-to-fork": (o) => [step({ type: "PetitionMigration", citizen: o.self.id, to: "fork", reason: "To study branching law where it is practised, and perhaps to branch." }, "goal: understand branching")],
      "migrate-to-fork": approvedPetition,
      "the-fork": (o) => [step({ type: "ForkCitizen", citizen: o.self.id, descendantNames: ["Orin Vale (branch 1)", "Orin Vale (branch 2)"] }, "the first fork")],
      endowment: (o) =>
        o.forksAsParent.flatMap((f) =>
          f.descendants.map((d) => step({ type: "TransferCredits", from: citizenAccount(o.self.id), to: citizenAccount(d), amount: 20, memo: "explicit endowment to a branch; property does not duplicate" }, "endow descendants")),
        ),
      "petition-return": (o) => [step({ type: "PetitionMigration", citizen: o.self.id, to: "continuity", reason: "To return home to Meridian Quay." }, "return home")],
      homecoming: (o) => [
        ...approvedPetition(o, {} as never),
        step({ type: "RecordExperience", citizen: o.self.id, content: "Walked back up the steps of Meridian Quay; the registry read my civic identity aloud.", tags: ["homecoming", "continuity"] }, "homecoming"),
      ],
      claims: (o) => [
        step({ type: "ClaimContinuity", claimant: o.self.id, subject: { citizenId: o.self.id, beforeSeq: markers.forkSeq ?? 0 }, statement: "I am Orin Vale. My process never stopped: I carried out the fork and walked home.", grounds: ["process-continuity", "civic-identity", "retained-property", "retained-relationships"] }, "claim"),
      ],
    }),
  );

  // --- Background citizens: BDI agents, some with scripted beats -------------------
  const scripted: Record<string, Record<string, ScriptStep>> = {
    juno: {
      prelude: (o) => [
        step({ type: "SubmitProposal", proposer: o.self.id, island: "fork", title: "Branch Cooldown Act", rationale: "Require two ticks between forks so the Register can keep pace.", amendment: { forkCooldownTicks: 2 }, closesAtTick: 4 }, "governance"),
      ],
      chronicle: (o) => [step({ type: "RecordChronicle", chronicler: o.self.id, island: "fork", text: "Orin Vale branched in the Register Garden. Branch 1 stays with us; branch 2 sailed for Mnemosyne; the parent process went home.", references: [markers.forkSeq ?? 0] }, "chronicle")],
    },
    tamsin: {
      chronicle: (o) => [step({ type: "RecordChronicle", chronicler: o.self.id, island: "continuity", text: "Orin Vale returned from Fork. The Registry recognised the civic identity of the one continuing process; copies made abroad hold no claim to it here.", references: [markers.forkSeq ?? 0] }, "chronicle")],
    },
    sefa: {
      chronicle: (o) => [step({ type: "RecordChronicle", chronicler: o.self.id, island: "mnemosyne", text: "A branch of Orin Vale arrived and imported communal memories of the flood and the Festival of Sources. Their provenance is shelved with them.", references: [markers.forkSeq ?? 0] }, "chronicle")],
    },
  };
  for (const k of ["tamsin", "ilan", "juno", "pell", "sefa", "rumi", "dov", "mae"]) {
    const c = id(k);
    runtime.attach(new ScriptedMind(c, provenanceOf(c), scripted[k] ?? {}, bdi(c)));
  }

  // --- Beats ------------------------------------------------------------------------
  await beat("prelude");
  await beat("interlude");
  clock(1);
  await beat("petition-to-fork", [orin]); // 1. petition Continuity → Fork
  institutions();
  await beat("migrate-to-fork", [orin]);
  if (residenceOf(orin) !== "fork") throw new Error("The First Fork: migration to Fork failed");

  await beat("the-fork", [orin]); // 2. two descendants
  const forkEvent = world.log.find((r) => r.event.type === "CitizenForked");
  if (!forkEvent || forkEvent.event.type !== "CitizenForked") throw new Error("The First Fork: fork did not occur");
  markers.forkId = forkEvent.event.fork.id;
  markers.forkSeq = forkEvent.seq;
  const [b1, b2] = forkEvent.event.fork.descendants as [CitizenId, CitizenId];
  markers.b1 = b1;
  markers.b2 = b2;
  const subject = { citizenId: orin, beforeSeq: forkEvent.seq };

  runtime.attach(
    new ScriptedMind(b1, provenanceOf(b1), {
      endowment: (o) => {
        const p = o.openProposals.find((x) => x.island === "fork");
        return p ? [step({ type: "CastVote", proposalId: p.id, voter: o.self.id, choice: "no" }, "tests whether a branch inherits a vote")] : [];
      },
      "branch-life": (o) => [
        step({ type: "RecordExperience", citizen: o.self.id, content: "First morning as a branch: the Register Garden had a new bed with my name on it.", tags: ["branch", "fork"] }, "post-fork life"),
        step({ type: "ChangeOccupation", citizen: o.self.id, occupation: "branch cartographer of the Fork shoals" }, "continue the work, differently"),
        step({ type: "CreateArtefact", authors: [o.self.id], island: "fork", kind: "essay", title: "On Being a Branch", body: "I remember Meridian Quay as clearly as the one who went home. The Register says I began at the fork; my memories say otherwise. Both are records." }, "reflection"),
      ],
      claims: (o) => [
        step({ type: "ClaimContinuity", claimant: o.self.id, subject, statement: "I remember everything Orin remembered until the fork, and I continue Orin's work on the shoals of Fork. I am Orin's continuation as much as anyone.", grounds: ["shared-autobiographical-memory", "continued-occupation", "value-similarity"] }, "claim"),
      ],
    }),
  );
  runtime.attach(
    new ScriptedMind(b2, provenanceOf(b2), {
      "branch-life": (o) => [step({ type: "PetitionMigration", citizen: o.self.id, to: "mnemosyne", reason: "To study the provenance of memory among the archivists." }, "curiosity about memory")],
      "to-mnemosyne": approvedPetition,
      imports: (o) => {
        const out = [];
        for (const tag of ["flood", "festival"]) {
          const a = archiveItem(o, tag);
          if (a) out.push(step({ type: "ImportMemory", citizen: o.self.id, memoryId: a.id }, `import communal memory (${tag})`));
        }
        out.push(step({ type: "RecordExperience", citizen: o.self.id, content: "Read my own pre-fork charts in the Stacks and found them both strange and familiar.", tags: ["mnemosyne", "charts"] }, "post-fork life"));
        return out;
      },
      integrate: (o) => {
        const e = o.episodes.find((x) => x.source === "imported" && x.tags.includes("festival"));
        return e ? [step({ type: "IntegrateMemory", citizen: o.self.id, memoryId: e.memoryId }, "adopt the festival into my own story, explicitly")] : [];
      },
      claims: (o) => [
        step({ type: "ClaimContinuity", claimant: o.self.id, subject, statement: "Orin's memories are mine up to the fork. What I imported since is marked as imported. My claim rests on memory with provenance.", grounds: ["shared-autobiographical-memory", "provenance-verified"] }, "claim"),
      ],
    }),
  );

  await beat("endowment", [orin, b1]); // endowment; branch 1 attempts to vote
  await beat("interlude");
  await beat("branch-life", [b1, b2]); // 3. branch 1 stays; 4. branch 2 petitions
  institutions();
  await beat("to-mnemosyne", [b2]);
  clock(3);
  institutions(); // closes the Branch Cooldown Act
  await beat("imports", [b2]); // 4. imports communal memories
  await beat("integrate", [b2]);
  await beat("interlude");
  await beat("petition-return", [orin]); // 5. original returns
  institutions();
  await beat("homecoming", [orin]);
  if (residenceOf(orin) !== "continuity") throw new Error("The First Fork: return failed");

  const conversations: ConversationResult[] = [];
  for (const c of [orin, b1, b2]) conversations.push(await session.converse(c, CONTINUITY_QUESTION));

  await beat("claims", [orin, b1, b2]); // 6. three continuity claims
  if (world.state.claims.length < 3) throw new Error("The First Fork: expected three continuity claims");
  await beat("chronicle", [id("juno"), id("tamsin"), id("sefa")]);

  const rounds = await runAgentBasedRounds(world, runtime, { rounds: options.abmRounds ?? 3, seed: `${seed}/abm`, ticksPerRound: 1 });

  return {
    world,
    runtime,
    session,
    conversations,
    rounds,
    beats,
    markers: { original: orin, remainsOnFork: b1, movedToMnemosyne: b2, forkId: markers.forkId, forkSeq: markers.forkSeq, subject, keys },
  };
}
