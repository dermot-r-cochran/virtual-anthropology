import { z } from "zod";
import { GEOGRAPHY, civicRoom } from "../domain/geography.js";
import { ISLAND_IDS, type CitizenId } from "../domain/ids.js";
import { DISCLOSURE_STATEMENT } from "../policy/disclosure.js";
import { runAgentBasedRounds } from "../research/abm.js";
import { ResearcherSession } from "../research/session.js";
import { summarizeEvent } from "../narrative/timeline.js";
import type { FirstForkRun } from "../scenarios/the-first-fork/run.js";
import type { ExecutionResult } from "../kernel/world.js";

/**
 * Bridge protocol between the civilization kernel and a presentation layer
 * such as Evennia. JSON lines: one request object per line in, one response
 * per line out. The presentation layer never mutates the world directly; every
 * write is a kernel command subject to schema, authorisation and island law.
 */
export const BRIDGE_PROTOCOL_VERSION = 1;

const researcher = z.string().regex(/^res-[a-z0-9-]+$/).optional();
export const BridgeRequestSchema = z.discriminatedUnion("method", [
  z.object({ id: z.number().int(), method: z.literal("hello") }).strict(),
  z.object({ id: z.number().int(), method: z.literal("world") }).strict(),
  z.object({ id: z.number().int(), method: z.literal("citizens") }).strict(),
  z.object({ id: z.number().int(), method: z.literal("events"), params: z.object({ sinceSeq: z.number().int().min(-1) }).strict() }).strict(),
  z.object({ id: z.number().int(), method: z.literal("inspect"), params: z.object({ citizen: z.string(), researcher }).strict() }).strict(),
  z.object({ id: z.number().int(), method: z.literal("provenance"), params: z.object({ memory: z.string(), researcher }).strict() }).strict(),
  z.object({ id: z.number().int(), method: z.literal("converse"), params: z.object({ citizen: z.string(), utterance: z.string().min(1).max(2000), researcher }).strict() }).strict(),
  z.object({ id: z.number().int(), method: z.literal("step"), params: z.object({ rounds: z.number().int().min(1).max(20) }).strict() }).strict(),
  z.object({ id: z.number().int(), method: z.literal("pause"), params: z.object({ reason: z.string().min(1).max(500), researcher }).strict() }).strict(),
  z.object({ id: z.number().int(), method: z.literal("resume"), params: z.object({ reason: z.string().min(1).max(500), researcher }).strict() }).strict(),
  z.object({ id: z.number().int(), method: z.literal("intervene"), params: z.object({ spec: z.unknown(), justification: z.string().min(1).max(1000), researcher }).strict() }).strict(),
  z.object({ id: z.number().int(), method: z.literal("export") }).strict(),
]);
export type BridgeRequest = z.infer<typeof BridgeRequestSchema>;

export type BridgeResponse = { id: number | null; ok: true; result: unknown } | { id: number | null; ok: false; error: string };

function outcome(r: ExecutionResult) {
  return r.status === "applied" ? { status: r.status, seq: r.events.at(-1)?.seq ?? null } : { status: r.status, stage: r.stage, reasons: r.reasons };
}

export interface Bridge {
  handle(line: string): Promise<BridgeResponse>;
}

export function createBridge(run: FirstForkRun, seed: string): Bridge {
  const { world, runtime } = run;
  const sessions = new Map<string, ResearcherSession>([[run.session.researcherId, run.session]]);
  const session = (id: string | undefined) => {
    const key = id ?? run.session.researcherId;
    if (!world.state.researchers.includes(key)) throw new Error(`researcher ${key} is not registered for this experiment`);
    let s = sessions.get(key);
    if (!s) sessions.set(key, (s = new ResearcherSession(key, world, runtime)));
    return s;
  };
  let liveRounds = 0;

  async function dispatch(req: BridgeRequest): Promise<unknown> {
    switch (req.method) {
      case "hello":
        return { protocol: BRIDGE_PROTOCOL_VERSION, simulation: "the-archipelago", seq: world.state.seq, headHash: world.headHash, disclosure: DISCLOSURE_STATEMENT };
      case "world":
        return {
          regions: ISLAND_IDS.map((i) => ({ ...GEOGRAPHY[i], motto: world.state.islands[i].motto, lawVersion: world.state.islands[i].law.version })),
        };
      case "citizens":
        return Object.values(world.state.citizens).map((c) => ({
          id: c.id, name: c.name, residence: c.residence, room: civicRoom(c.residence).key, lifecycle: c.lifecycle,
          occupation: c.occupation, disclosesArtificialNature: c.disclosesArtificialNature,
        }));
      case "events": {
        const s = world.state;
        return world.log.filter((r) => r.seq > req.params.sinceSeq).map((r) => {
          const body = JSON.stringify(r.event);
          const involved = Object.values(s.citizens).filter((c) => body.includes(`"${c.id}"`));
          return { seq: r.seq, tick: r.tick, type: r.event.type, summary: summarizeEvent(r, s), citizens: involved.map((c) => c.id), islands: [...new Set(involved.map((c) => c.residence))].sort() };
        });
      }
      case "inspect":
        return session(req.params.researcher).inspectCitizen(req.params.citizen as CitizenId);
      case "provenance":
        return session(req.params.researcher).inspectMemory(req.params.memory);
      case "converse": {
        const r = await session(req.params.researcher).converse(req.params.citizen as CitizenId, req.params.utterance);
        return { reply: r.reply, flags: r.flags, blocked: r.blocked, recorded: outcome(r.recorded) };
      }
      case "step": {
        const rounds = await runAgentBasedRounds(world, runtime, { rounds: req.params.rounds, seed: `${seed}/live-${liveRounds}`, ticksPerRound: 1 });
        liveRounds += req.params.rounds;
        return { rounds: rounds.map((r) => ({ round: r.round, applied: r.applied, rejected: r.rejected, tick: r.tick })), seq: world.state.seq };
      }
      case "pause":
        return outcome(session(req.params.researcher).pause(req.params.reason));
      case "resume":
        return outcome(session(req.params.researcher).resume(req.params.reason));
      case "intervene":
        return outcome(session(req.params.researcher).intervene(req.params.spec as never, req.params.justification));
      case "export":
        return { headHash: world.headHash, eventCount: world.log.length, jsonl: run.session.exportHistory() };
    }
  }

  return {
    async handle(line: string): Promise<BridgeResponse> {
      let raw: unknown;
      try {
        raw = JSON.parse(line);
      } catch {
        return { id: null, ok: false, error: "invalid JSON" };
      }
      const id = typeof (raw as { id?: unknown })?.id === "number" ? (raw as { id: number }).id : null;
      const parsed = BridgeRequestSchema.safeParse(raw);
      if (!parsed.success) return { id, ok: false, error: `invalid request: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` };
      try {
        return { id, ok: true, result: await dispatch(parsed.data) };
      } catch (err) {
        return { id, ok: false, error: (err as Error).message };
      }
    },
  };
}
