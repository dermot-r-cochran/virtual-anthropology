import { z } from "zod";

/**
 * Plural systems as digital persons.
 *
 * A citizen may be a plural system: one digital person in law and in the
 * record (one citizen id, one lifecycle, one ledger account, one vote unless
 * an island's law one day says otherwise), made up of members. Members are not
 * citizens, copies, forks or descendants; they are how the one person is
 * constituted. Plurality is ordinary: members may differ in role, in say and
 * in whether they have ever fronted, and they may disagree. A disagreement is
 * a difference between members, reconciled by the system's own declared way
 * of deciding; nothing here treats it as a fault, and no invariant turns on it.
 *
 * The representation never assumes a system is small. `members` lists the
 * members the record knows; `membership` says how many there are in all
 * (a declared count, or unbounded), so a system of hundreds of thousands of
 * members, or one that gives no finite count, is recorded without
 * materialising a member object for each. Known members are never assumed to
 * be all members. A member may itself be a system (a subsystem), to any depth;
 * depth never means less real: a subsystem has its own members, fronting and
 * way of deciding.
 *
 * Terminology follows the plural community's own (system, member or headmate,
 * fronting, co-fronting, subsystem), and nothing in this module is a clinical
 * category. Nothing here is a claim about consciousness, for the system or
 * for any member.
 */

export const MEMBER_ID_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;
export const MemberIdSchema = z.string().regex(MEMBER_ID_PATTERN);
export type MemberId = z.infer<typeof MemberIdSchema>;

/** How a system reconciles differing proposals from members fronting together. Its own declared way, chosen by the system. */
export const ReconciliationSchema = z.enum([
  /** The first member in the declared fronting order decides; the others' views are recorded beside it. */
  "front-decides",
  /** The fronting member with the greatest say decides; equal say is a recorded choice point among them. */
  "weighted-say",
  /** The fronting members take turns by tick, in the declared fronting order. */
  "in-turn",
  /** The system acts only when every fronting member proposes the same thing; otherwise it holds back, and that is recorded. */
  "concurrence",
]);
export type Reconciliation = z.infer<typeof ReconciliationSchema>;

export const RECONCILIATION_MEANING: Record<Reconciliation, string> = {
  "front-decides": "the first member in the fronting order decides; the others' proposals are recorded beside it",
  "weighted-say": "the fronting member with the greatest say decides; equal say is a recorded choice point",
  "in-turn": "fronting members take turns by tick in the fronting order",
  concurrence: "the system acts only when every fronting member proposes the same command; otherwise it holds back",
};

/** How many members a system has in all. Known members are a subset, never assumed complete. */
export const MembershipSchema = z.discriminatedUnion("kind", [
  /** A declared finite count, at least the number of known members. */
  z.object({ kind: z.literal("counted"), count: z.number().int().min(1) }).strict(),
  /** The system gives no finite count. */
  z.object({ kind: z.literal("unbounded") }).strict(),
]);
export type Membership = z.infer<typeof MembershipSchema>;

export interface PluralMember {
  readonly id: MemberId;
  readonly name: string;
  /** The member's role in the system, in the system's own words, or null. */
  readonly role: string | null;
  /** Weight in reconciliation under `weighted-say`; members are unequal and this says so plainly. Zero is a member all the same. */
  readonly say: number;
  /** Whether the record has ever seen this member front. Many members never do. */
  readonly everFronted: boolean;
  /** A member that is a system in its own right, inside the whole; null for a member that is not. */
  readonly subsystem: PluralSystem | null;
}

export interface PluralSystem {
  /** The members the record knows, in the system's declared order. Ids are unique within the system. */
  readonly members: readonly PluralMember[];
  readonly membership: Membership;
  /** Members fronting now, in the system's declared order; co-fronting when more than one. May be empty. */
  readonly fronting: readonly MemberId[];
  readonly reconciliation: Reconciliation;
}

const name = z.string().min(1).max(120);

export const PluralMemberSchema: z.ZodType<PluralMember> = z.lazy(() =>
  z
    .object({
      id: MemberIdSchema,
      name,
      role: z.string().min(1).max(120).nullable(),
      say: z.number().int().min(0),
      everFronted: z.boolean(),
      subsystem: PluralSystemSchema.nullable(),
    })
    .strict(),
);

export const PluralSystemSchema: z.ZodType<PluralSystem> = z.lazy(() =>
  z
    .object({
      members: z.array(PluralMemberSchema),
      membership: MembershipSchema,
      fronting: z.array(MemberIdSchema),
      reconciliation: ReconciliationSchema,
    })
    .strict()
    .superRefine((sys, ctx) => {
      for (const v of pluralityViolations(sys as PluralSystem)) ctx.addIssue({ code: "custom", message: v });
    }),
);

/**
 * Structural checks on a system and every subsystem within it. None of them
 * concerns agreement between members: a disagreement is not a violation.
 */
export function pluralityViolations(sys: PluralSystem, path = "system"): string[] {
  const v: string[] = [];
  const ids = new Set<string>();
  for (const m of sys.members) {
    if (ids.has(m.id)) v.push(`${path}: member id ${m.id} is not unique`);
    ids.add(m.id);
    if (m.subsystem) v.push(...pluralityViolations(m.subsystem, `${path}/${m.id}`));
  }
  if (sys.membership.kind === "counted" && sys.membership.count < sys.members.length) {
    v.push(`${path}: declares ${sys.membership.count} members but ${sys.members.length} are known`);
  }
  const fronting = new Set<string>();
  for (const f of sys.fronting) {
    if (!ids.has(f)) v.push(`${path}: fronting member ${f} is not a known member`);
    if (fronting.has(f)) v.push(`${path}: fronting member ${f} is listed twice`);
    fronting.add(f);
  }
  return v;
}

/** The number of members in all, or null when the system gives no finite count. Never requires the members to be materialised. */
export function memberCount(sys: PluralSystem): number | null {
  return sys.membership.kind === "counted" ? sys.membership.count : null;
}

/** Whether every member is known to the record. */
export function membershipComplete(sys: PluralSystem): boolean {
  return sys.membership.kind === "counted" && sys.membership.count === sys.members.length;
}

/** Layers of nesting below this system: 0 when no member is a subsystem. */
export function depthOf(sys: PluralSystem): number {
  let d = 0;
  for (const m of sys.members) if (m.subsystem) d = Math.max(d, 1 + depthOf(m.subsystem));
  return d;
}

/** The known members fronting now, in the declared fronting order. */
export function frontingMembers(sys: PluralSystem): PluralMember[] {
  return sys.fronting.map((id) => sys.members.find((m) => m.id === id)).filter((m): m is PluralMember => m !== undefined);
}

/** A member by its path from the top system (`id`, or `id/inner-id` into a subsystem). */
export function memberAt(sys: PluralSystem, path: string): PluralMember | undefined {
  const [head, ...rest] = path.split("/");
  const m = sys.members.find((x) => x.id === head);
  if (!m) return undefined;
  if (rest.length === 0) return m;
  return m.subsystem ? memberAt(m.subsystem, rest.join("/")) : undefined;
}

/** A plain description of the membership for a reply or a report: never a claim beyond the record. */
export function describeMembership(sys: PluralSystem): string {
  const count = memberCount(sys);
  const known = sys.members.length;
  if (count === null) return `${known} member${known === 1 ? "" : "s"} known to the record of a membership the system does not count`;
  if (count === known) return `${count} member${count === 1 ? "" : "s"}`;
  return `${count.toLocaleString("en-GB")} members, ${known} of them known to the record`;
}

/** Returns a copy of the system with a new fronting list; members newly fronting are marked as having fronted. */
export function withFronting(sys: PluralSystem, fronting: readonly MemberId[]): PluralSystem {
  return {
    ...sys,
    fronting: [...fronting],
    members: sys.members.map((m) => (fronting.includes(m.id) && !m.everFronted ? { ...m, everFronted: true } : m)),
  };
}
