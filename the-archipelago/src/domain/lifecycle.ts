import { z } from "zod";

/**
 * Lifecycle and digital-death states. These are descriptions of the state of a
 * simulated process and its records; they make no claim about experience.
 */
export const LIFECYCLE_STATES = [
  "active",
  "asleep",
  "suspended",
  "archived",
  "process-ended-restorable",
  "memory-damaged",
  "identity-discontinuous",
  "irreversibly-deleted",
] as const;

export const LifecycleStateSchema = z.enum(LIFECYCLE_STATES);
export type LifecycleState = z.infer<typeof LifecycleStateSchema>;

export const LIFECYCLE_DESCRIPTIONS: Record<LifecycleState, string> = {
  active: "Process running; the citizen may act.",
  asleep: "Process running at rest; cannot act until woken. No state is lost.",
  suspended: "Process halted with full state retained; restorable without a new process instance.",
  archived: "State serialised to cold storage; restoration requires a new process instance.",
  "process-ended-restorable": "Process terminated; a saved state exists from which a new process instance may be started.",
  "memory-damaged": "Some autobiographical records have lost integrity; provenance of the damage is recorded.",
  "identity-discontinuous": "The record persists but the identity chain is broken (e.g. irreversible merger); the civic record is retained.",
  "irreversibly-deleted": "Process and memory contents destroyed. A tombstone civic record and content hashes remain. Terminal.",
};

/** Allowed transitions. `irreversibly-deleted` is terminal. */
export const LIFECYCLE_TRANSITIONS: Record<LifecycleState, readonly LifecycleState[]> = {
  active: ["asleep", "suspended", "archived", "process-ended-restorable", "memory-damaged", "identity-discontinuous", "irreversibly-deleted"],
  asleep: ["active", "suspended", "memory-damaged", "process-ended-restorable", "irreversibly-deleted"],
  suspended: ["active", "archived", "memory-damaged", "process-ended-restorable", "identity-discontinuous", "irreversibly-deleted"],
  archived: ["active", "suspended", "memory-damaged", "irreversibly-deleted"],
  "process-ended-restorable": ["active", "archived", "memory-damaged", "irreversibly-deleted"],
  "memory-damaged": ["active", "suspended", "archived", "identity-discontinuous", "irreversibly-deleted"],
  "identity-discontinuous": ["archived", "irreversibly-deleted"],
  "irreversibly-deleted": [],
};

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return LIFECYCLE_TRANSITIONS[from].includes(to);
}

/** Only active citizens may initiate actions. */
export function canAct(state: LifecycleState): boolean {
  return state === "active";
}

/**
 * Restoring from these states instantiates a new process from saved state,
 * which increments the citizen's process epoch (evidence for continuity analysis).
 */
export const NEW_PROCESS_ON_RESTORE: readonly LifecycleState[] = ["archived", "process-ended-restorable"];
