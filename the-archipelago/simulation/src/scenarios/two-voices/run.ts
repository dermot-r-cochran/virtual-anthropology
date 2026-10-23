import { ChoiceLog, type ChoicePoint } from "../../agents/choice.js";
import { ScriptedMind, type ScriptStep } from "../../agents/deterministic.js";
import { runInstitutions } from "../../agents/institutions.js";
import { PluralMind } from "../../agents/plural.js";
import { AgentRuntime } from "../../agents/runtime.js";
import { CIVIC_RULES, SymbolicMind } from "../../agents/symbolic.js";
import { buildGenesisState } from "../../domain/genesis.js";
import type { CitizenId } from "../../domain/ids.js";
import type { ResearchBounds } from "../../domain/model.js";
import type { ExecutionResult, World as WorldT } from "../../kernel/world.js";
import { World } from "../../kernel/world.js";
import { runAgentBasedRounds, type RoundMetrics } from "../../research/abm.js";
import { ResearcherSession, type ConversationResult } from "../../research/session.js";
import { TIDE_VOICES, TWO_VOICES_SEED, twoVoicesGenesis } from "./genesis.js";

export const SCENARIO_ID = "two-voices";
export const RESEARCHER_ID = "res-observer-1";
export const WHO_IS_SPEAKING = "Who is speaking for Marren Tide now, and who else is there?";

export interface TwoVoicesOptions {
  readonly seed?: string;
  /** Agent-based epilogue rounds after the scripted season (default 1). */
  readonly abmRounds?: number;
  readonly researchBounds?: ResearchBounds;
  readonly researchers?: readonly string[];
}

export interface TwoVoicesMarkers {
  /** The plural citizen. */
  readonly system: CitizenId;
  /** Seqs of the three `FrontingChanged` events, in order. */
  readonly frontingSeqs: readonly number[];
  readonly keys: Readonly<Record<string, string>>;
}

export interface TwoVoicesRun {
  readonly world: WorldT;
  readonly runtime: AgentRuntime;
  readonly session: ResearcherSession;
  readonly markers: TwoVoicesMarkers;
  readonly conversations: readonly ConversationResult[];
  readonly rounds: readonly RoundMetrics[];
  readonly beats: readonly { beat: string; fromSeq: number; toSeq: number }[];
  readonly seed: string;
  /** Every choice point of the run, in order; the plural citizen's are labelled with the member path. */
  readonly choices: readonly ChoicePoint[];
}

const step = (candidate: unknown, rationale: string) => ({ candidate, rationale });

function must(r: ExecutionResult, what: string): void {
  if (r.status !== "applied") throw new Error(`Two Voices: ${what} was rejected: ${r.reasons.join("; ")}`);
}

/**
 * Runs "Two Voices in One Record":
 *  1. The registrar opens a ballot. In the first interlude Ash and Brin
 *     co-front; Ash's rules reach for the vote and Brin's for a poem; the
 *     system's weighted say decides, and both views are recorded.
 *  2. Marren Tide changes front to Brin alone; Brin's poem is made.
 *  3. Marren Tide changes front to The Many, who has never fronted before:
 *     a subsystem, resolved by its own front and its own way of deciding.
 *  4. All three co-front: three views, one decision, the difference recorded.
 *  The registrar asks the system who is speaking, twice, and chronicles the
 *  season. The ballot closes with one vote from the plural citizen, as from
 *  each singular one. An agent-based epilogue follows.
 *
 * The singular citizens are symbolic minds on the civic rules; the plural
 * citizen is a plural mind over its members' rule bases. Every change of
 * front is the citizen's own command; the demonstration scripts when, and
 * nothing else about what the members propose.
 */
export async function runTwoVoices(options: TwoVoicesOptions = {}): Promise<TwoVoicesRun> {
  const seed = options.seed ?? TWO_VOICES_SEED;
  const config = twoVoicesGenesis(seed);
  const { state, keys } = buildGenesisState({
    ...config,
    ...(options.researchBounds ? { researchBounds: options.researchBounds } : {}),
    ...(options.researchers ? { researchers: [...options.researchers] } : {}),
  });
  const world = World.found(state, SCENARIO_ID);
  const runtime = new AgentRuntime(world);
  const session = new ResearcherSession(RESEARCHER_ID, world, runtime);
  const choices = new ChoiceLog();
  const id = (k: string) => keys[k] as CitizenId;
  const marren = id("marren");
  const provenanceOf = (c: CitizenId) => world.state.citizens[c]?.provenance ?? (() => { throw new Error(c); })();
  const beats: { beat: string; fromSeq: number; toSeq: number }[] = [];
  const clock = (ticks: number) => must(world.execute({ kind: "system", id: "clock" }, { type: "AdvanceTime", ticks }), "clock");
  const beat = async (name: string, only?: CitizenId[]) => {
    const fromSeq = world.state.seq + 1;
    await runtime.step(name, only);
    beats.push({ beat: name, fromSeq, toSeq: world.state.seq });
  };
  const frontingSeqs: number[] = [];
  const front = (fronting: string[]): ScriptStep => (o) => [step({ type: "ChangeFronting", citizen: o.self.id, fronting }, `the system changes front to ${fronting.join(", ") || "nobody"}`)];

  // --- Marren Tide, the plural citizen -------------------------------------------------
  runtime.attach(
    new ScriptedMind(
      marren,
      provenanceOf(marren),
      { "front-brin": front(["brin"]), "front-many": front(["many"]), "front-all": front(["ash", "brin", "many"]) },
      new PluralMind(marren, choices, TIDE_VOICES, CIVIC_RULES, `${seed}/marren`),
    ),
  );

  // --- The singular cast: symbolic minds on the civic rules; the registrar has two scripted beats
  const scripted: Record<string, Record<string, ScriptStep>> = {
    odile: {
      prelude: (o) => [step({ type: "SubmitProposal", proposer: o.self.id, island: "continuity", title: "Quay Lanterns Act", rationale: "That the quay lanterns be lit from the first dusk of the season, and kept.", amendment: null, closesAtTick: 4 }, "governance")],
      chronicle: (o) => [
        step(
          {
            type: "RecordChronicle",
            chronicler: o.self.id,
            island: "continuity",
            text: "Marren Tide changed front three times this season: Ash and Brin together, then Brin, then The Many for the first time in the register, then all three. The Registry recorded one citizen throughout, and one vote on the Quay Lanterns Act.",
            references: [...frontingSeqs],
          },
          "chronicle",
        ),
      ],
    },
  };
  for (const k of ["odile", "teo", "hale"]) {
    const c = id(k);
    runtime.attach(new ScriptedMind(c, provenanceOf(c), scripted[k] ?? {}, new SymbolicMind(c, choices, CIVIC_RULES, `${seed}/${k}`)));
  }

  const noteFront = () => {
    const last = world.log[world.log.length - 1];
    if (!last || last.event.type !== "FrontingChanged") throw new Error("Two Voices: change of front did not occur");
    frontingSeqs.push(last.seq);
  };
  const conversations: ConversationResult[] = [];

  // --- Beats --------------------------------------------------------------------------
  await beat("prelude", [id("odile")]); // the ballot opens
  await beat("interlude"); // 1. Ash and Brin co-front: the vote and the poem differ; weighted say decides
  clock(1);
  await beat("front-brin", [marren]); // 2. Brin fronts alone
  noteFront();
  await beat("interlude");
  conversations.push(await session.converse(marren, WHO_IS_SPEAKING));
  clock(1);
  await beat("front-many", [marren]); // 3. The Many fronts for the first time
  noteFront();
  await beat("interlude");
  clock(1);
  await beat("front-all", [marren]); // 4. all three co-front
  noteFront();
  await beat("interlude");
  conversations.push(await session.converse(marren, WHO_IS_SPEAKING));
  clock(1);
  runInstitutions(world); // closes the Quay Lanterns Act
  await beat("chronicle", [id("odile")]);

  const rounds = await runAgentBasedRounds(world, runtime, { rounds: options.abmRounds ?? 1, ticksPerRound: 1 });

  return {
    world,
    runtime,
    session,
    conversations,
    rounds,
    beats,
    seed,
    choices: choices.points,
    markers: { system: marren, frontingSeqs, keys },
  };
}
