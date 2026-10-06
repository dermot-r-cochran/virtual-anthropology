# Lot, then vote: a representative chamber for an island

A design note, 6 October 2026. Nothing in it is implemented: the Archipelago's
islands decide by referendum (a *proposal* is a yes/no/abstain vote open to the
whole electorate snapshot, `docs/glossary.md`) and have no representatives.
This note records what a representative chamber would look like if an island
adopted one, how the one new idea in it maps onto this platform's rules, and
what a study of it would have to declare. The same design is written for the
real world in `dermot-r-cochran/Voting`, `docs/lot-then-vote.md`; the two
notes say the same thing, and a decision changed in one is changed in the
other.

## The design

A chamber whose **candidates are drawn by lot** and whose **members are then
elected from that pool by ordinary vote**. The draw is stratified and
redrawn to quota; service is voluntary with opt-outs, paid and protected; the
draw is vetted. Sitting members may stand again under renewal rules that keep
experience in the chamber without promising any person a path (the author's
decisions, 6 October 2026):

1. one automatic renewal;
2. then a ticket back into the draw that halves each term;
3. staggered terms, a third of the chamber at a time;
4. a paid alumni college for members who leave, to brief and mentor;
5. a step in pay for the second term.

Parties (also decided): a pool candidate may state a **prior affiliation**,
one held before the draw, and parties may not nominate, endorse or spend.

Sizing (also decided): the lower house has as many seats as the cube root
of the voting population, the upper house about a third of that, and the
executive council about a quarter of the upper house again, deputies not
counted. At this platform's actual scale, eleven citizens in *The First
Fork* and two or three living on each island
(`exports/the-first-fork-v1/dataset.json`), the rule gives a one-seat
chamber and an upper house and executive that round to zero; for an island
of a few hundred it would give six or seven, two and one. The design is
written for electorates of thousands upward, and a study here would have
to say that its chamber is a model of the rule and not of the chamber.

AI mediation and synthesis (also decided): a synthesis of what citizens
say is a briefing to the drawn chamber, under six rules (every claim cites
its utterances; disagreement is structure, never one paragraph;
interpretation is never generated; several mediators with their agreement
reported; members may dissent from the briefing on the record; confidence
carried as how many, how stable, how contested). The reference
implementation is `episteme/population.py` in `dermot-r-cochran/swarm`
(ADR-0004 there), and its first population is this platform's citizens,
read one way from a published export by `examples/archipelago_first_fork.py`
there: every line cited to this record's event hashes, interpretation
recorded as none. The Archipelago is the right first population because
its citizens have no privacy to lose and cannot be brigaded, and the
synthesis can be checked against the log.

The flaw the renewal rules answer: if sitting members may always stand and
challengers come only from the pool, every contest is a known name against
strangers, and the chamber ossifies. A toy model in the Voting crate
(`examples/tenure.rs`) shows the always-eligible rule leaving about half the
chamber with fifteen or more years' service, the decaying ticket about a
sixth.

## How it would sit in the Archipelago

- **A draw is a choice point, not a random event.** There is no randomness in
  the simulation (`agents/choice.ts`; Dermot's direction, 2026-10-02). A
  lottery here would be recorded as a choice point over the eligible
  citizens, taking the first in canonical order by default, with the
  alternatives explored as timelines in the fair, unbiased and representative
  order of `research/enumeration.ts`. That is a better fit than it first
  looks: a sortition's whole claim is that *any* draw from the stratified
  pool is as legitimate as any other, which is exactly what a branch sweep
  over the draw would test. "Randomness just means underdetermined or not
  fully known" is the sortition argument restated.
- **Stratification is quota over canonical attributes.** Island, lineage
  (origin or fork descendant), memory provenance class and age in ticks are
  the attributes the platform already carries; a quota would be declared in
  the manifest and the redraw-to-quota rule would be an enumeration
  constraint, not a filter applied after the fact.
- **The chamber would be a fourth statutory field.** Governance today is one
  scheme on every island, parameterised by `votingQuorum`, `votingThreshold`
  and `countingRule`. A chamber would add a field naming who votes on a
  proposal: the electorate snapshot (today's rule everywhere) or a chamber
  drawn and elected under this design. Amendable by proposal, variable in a
  study, recorded on every `ProposalClosed` event, as the other three are.
- **Doctrine decides whether an island may have one at all.** Continuity
  counts the whole electorate because it is one unbroken body; a chamber
  speaking for it would be a change of doctrine, not a parameter. Concord
  requires consensus and a chamber cannot consent on another's behalf. Fork
  and Mnemosyne, which already let a branch or a record speak for itself,
  are the islands where representation is consistent with the founding
  rule, and the ones a first study would use.
- **Eligibility is a lifecycle question.** Only active citizens are in the
  electorate snapshot; the same rule bounds the pool. A member who forks,
  merges or enters a death state mid-term vacates the seat, and the
  vacancy is a recorded event.

## What a study would declare

Under `docs/research-methodology.md`, *Studies*: a `doctrines` variant on one
island enacting the chamber at founding, a `branches` sweep over the draw's
choice points, and a control timeline with no chamber. Metrics already in the
registry that would move: `governance.proposals`, `governance.laws_enacted`
and `governance.votes_cast`, the last of which counts chamber votes under a
chamber and electorate votes without one, so a comparison across the two has
to say so. A new metric would be needed for the lineage distribution of those
who hold seats against those who do not. It would be a
*demonstration*, not an *experiment*, until the minds do something other than
take the first option in canonical order.

None of this is scheduled. It is written down so that the next person to
touch `kernel/decide.ts` or the statutory fields knows the shape of the thing
that may one day sit beside them.
