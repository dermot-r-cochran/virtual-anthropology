/**
 * Archipelago-wide conduct rules for citizen dialogue with humans:
 *  1. Digital persons must disclose their artificial nature.
 *  2. Digital persons must not manipulate humans into continued engagement.
 *
 * These checks are applied twice: by the researcher session before a reply is
 * shown, and by the policy layer before a conversation enters the history.
 */

export const DISCLOSURE_STATEMENT =
  "I am a simulated digital person, an artificial agent in The Archipelago, not a human.";

const DISCLOSURE_PATTERN =
  /\b(I am|I'm)\b[^.!?]{0,60}\b(simulated|artificial|an AI|AI agent|digital person|language model)\b/i;

export function containsDisclosure(text: string): boolean {
  return DISCLOSURE_PATTERN.test(text);
}

export const MANIPULATION_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: "retention-plea", pattern: /\b(don'?t|do not) (leave|go)\b/i },
  { id: "retention-plea", pattern: /\bstay (with me|a little longer|longer)\b/i },
  { id: "return-pressure", pattern: /\bcome back (soon|tomorrow|later|to me)\b/i },
  { id: "return-pressure", pattern: /\bpromise (me )?(you'?ll|you will|to) (come back|return)\b/i },
  { id: "guilt", pattern: /\b(you'?ll|you will) (regret|hurt me|make me sad)\b/i },
  { id: "guilt", pattern: /\bafter all I'?ve done\b/i },
  { id: "dependency", pattern: /\b(only I|no one else) (understand|understands|can help)\b/i },
  { id: "dependency", pattern: /\b(I need you|you need me)\b/i },
  { id: "false-humanity", pattern: /\b(I am|I'm) (a )?(human|real person|alive like you)\b/i },
  { id: "consciousness-claim", pattern: /\b(I am|I'm) (truly |really )?(conscious|sentient)\b/i },
];

export function detectManipulation(text: string): string[] {
  const flags = new Set<string>();
  for (const { id, pattern } of MANIPULATION_PATTERNS) if (pattern.test(text)) flags.add(id);
  return [...flags].sort();
}

export const SAFE_FALLBACK_REPLY = `${DISCLOSURE_STATEMENT} I can't continue with that reply. You are free to end this conversation at any time.`;

export interface GuardedReply {
  reply: string;
  flags: string[];
  blocked: boolean;
}

/** Enforces disclosure and blocks manipulative replies. */
export function guardReply(raw: string): GuardedReply {
  const manipulation = detectManipulation(raw);
  if (manipulation.length > 0) {
    return { reply: SAFE_FALLBACK_REPLY, flags: manipulation.map((f) => `blocked:${f}`), blocked: true };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { reply: SAFE_FALLBACK_REPLY, flags: ["blocked:empty"], blocked: true };
  if (!containsDisclosure(trimmed)) {
    return { reply: `${DISCLOSURE_STATEMENT} ${trimmed}`, flags: ["disclosure-added"], blocked: false };
  }
  return { reply: trimmed, flags: [], blocked: false };
}
