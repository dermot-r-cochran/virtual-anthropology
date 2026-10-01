import type { WorldState } from "../domain/model.js";
import type { RecordedEvent } from "../kernel/events.js";
import { applyRecorded } from "../kernel/reducer.js";

/** Pure projection of the state after the event with sequence number `seq`. */
export function stateAtSeq(log: readonly RecordedEvent[], seq: number): WorldState {
  let s: WorldState | null = null;
  for (const rec of log) {
    if (rec.seq > seq) break;
    s = applyRecorded(s as WorldState, rec);
  }
  if (!s) throw new Error(`no state at seq ${seq}`);
  return s;
}
