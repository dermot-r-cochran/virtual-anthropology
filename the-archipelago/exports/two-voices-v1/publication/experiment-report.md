# Two Voices in One Record

_Publication draft `pub-two-voices-v1`, generated from experiment `two-voices-v1`._

> The repository studies virtual civilizations. It does not attempt to prove, infer, or assign consciousness. Research outputs distinguish observations, metrics, hypotheses, and interpretations.

# Abstract

> _Epistemic category: Observation — restates recorded events or computed values._

Demonstration `two-voices-v1` ran scenario `two-voices` with seed `archipelago/two-voices/v1` on simulation 0.1.0. The event store recorded 34 events over 5 ticks, with 4 citizen records, 0 fork event(s) and 0 continuity claim(s). 4 operationalised hypotheses were evaluated: 4 result(s) consistent and 0 not consistent with the hypothesis as operationalised. This abstract restates computed values only. It contains no interpretation.

# Research Question

> _Epistemic category: Method — design and configuration as declared._

**q-one-person-many-voices**: When one digital person is a plural system whose members front, co-front and differ, what does the civic record hold: how many persons, how many votes, how many copies, and how is a difference between members recorded?

_Motivation (researcher-authored):_ Plurality is ordinary. A platform that studies digital persons must be able to register a plural system as one citizen without reading its members as copies, descendants or faults, and must show a disagreement between members as what it is: a recorded difference, reconciled by the system's own way.

# Hypothesis

> _Epistemic category: Hypothesis — researcher-authored, tested only as operationalised._

- **h1-one-record**: A plural system of unbounded membership, with a subsystem of 720,000 members, is one citizen record among the four founded.
  - Operationalisation: `population.records == 4`
- **h2-no-copy**: Three changes of front, one of them a member fronting for the first time, create no descendant record: a change of front is not a copy.
  - Operationalisation: `identity.fork_descendants == 0`
- **h3-one-vote**: Each of the four citizens casts exactly one vote on the one proposal; the plural system votes once, whichever members front.
  - Operationalisation: `governance.votes_cast == 4`
- **h4-difference-is-not-a-fault**: The members' differing proposals, reconciled by the system's declared way, produce no rejected command.
  - Operationalisation: `governance.commands_rejected == 0`

# Experimental Design

> _Epistemic category: Method — design and configuration as declared._

_Scenario description (researcher-authored):_ One citizen of Continuity, Marren Tide, is a plural system: three members known to the record of a membership the system does not count, one of them a subsystem of 720,000 who has never fronted. The other three citizens are singular. Over one season the system changes front three times by its own command, its co-fronting members propose different things in the same interlude, and the system's declared way of deciding (weighted say) reconciles them with every member's view recorded beside the decision. The registrar asks who is speaking; the ballot closes with one vote from the plural citizen as from each singular one. Every mind is symbolic, so every proposal carries the trace of the rules that produced it.

- Category: demonstration — the protagonists' actions are authored by the scenario, so a finding consistent with its hypothesis shows that the platform and the declared law tables produce the declared outcome. It is not evidence about what citizens would do.
- Minds: symbolic (`archipelago-symbolic` 1.0.0, prompt `archipelago/symbolic/civic/v1`)
- Researchers: `res-observer-1` (observer and interlocutor; asks the plural citizen who is speaking)
- Research bounds: interventions deliver-message; at most 1; max grant 0
- Agent-based epilogue rounds: 1
- Kernel: deterministic, event-sourced. Only commands that pass schema, authorisation and island-law validation change the world.

# Configuration

> _Epistemic category: Provenance — identifiers for reproduction._

| key | value |
|---|---|
| experiment id | `two-voices-v1` |
| civilization id | `archipelago-two-voices` |
| simulation version | 0.1.0 |
| interchange version | 1 |
| configuration hash | `824da84341d12aeef036b7678956721595e4c8210d7b9fb1f0cab7c6ea7e2c60` |
| seed | `archipelago/two-voices/v1` |
| start timestamp | 2026-01-01T00:00:00.000Z |
| end timestamp | 2026-01-01T00:00:00.000Z |

# Results

> _Epistemic category: Metric — computed by a documented, deterministic function._

### Findings

| hypothesis | metric | observed | test | outcome |
|---|---|---:|---|---|
| h1-one-record | `population.records` | 4 | `== 4` | consistent-with-hypothesis |
| h2-no-copy | `identity.fork_descendants` | 0 | `== 0` | consistent-with-hypothesis |
| h3-one-vote | `governance.votes_cast` | 4 | `== 4` | consistent-with-hypothesis |
| h4-difference-is-not-a-fault | `governance.commands_rejected` | 0 | `== 0` | consistent-with-hypothesis |

- Hypothesis h1-one-record: computed `population.records` = 4; the test `population.records == 4` is true. The result is consistent with the hypothesis as operationalised, in this single deterministic run.
- Hypothesis h2-no-copy: computed `identity.fork_descendants` = 0; the test `identity.fork_descendants == 0` is true. The result is consistent with the hypothesis as operationalised, in this single deterministic run.
- Hypothesis h3-one-vote: computed `governance.votes_cast` = 4; the test `governance.votes_cast == 4` is true. The result is consistent with the hypothesis as operationalised, in this single deterministic run.
- Hypothesis h4-difference-is-not-a-fault: computed `governance.commands_rejected` = 0; the test `governance.commands_rejected == 0` is true. The result is consistent with the hypothesis as operationalised, in this single deterministic run.

### Metrics

| metric | value | unit |
|---|---:|---|
| `population.records` | 4 | persons |
| `population.active` | 4 | persons |
| `population.genesis` | 4 | persons |
| `population.stateless` | 0 | persons |
| `identity.forks` | 0 | events |
| `identity.fork_descendants` | 0 | persons |
| `identity.mergers` | 0 | events |
| `identity.continuity_claims` | 0 | claims |
| `identity.process_continuers` | 0 | persons |
| `identity.civic_continuers` | 0 | persons |
| `identity.memory_continuers` | 0 | persons |
| `identity.dimension_divergence` | 0 | persons |
| `legal.recognition_range` | 0 | persons |
| `legal.unadjudicating_islands` | 0 | islands |
| `governance.proposals` | 1 | proposals |
| `governance.laws_enacted` | 0 | laws |
| `governance.votes_cast` | 4 | votes |
| `governance.votes_refused_outside_electorate` | 0 | commands |
| `governance.commands_rejected` | 0 | commands |
| `governance.migrations` | 0 | events |
| `memory.records` | 4 | records |
| `memory.imported` | 0 | records |
| `memory.integrated` | 0 | records |
| `memory.fork_inherited` | 0 | records |
| `memory.provenance_complete` | 1 | fraction |
| `culture.artefacts` | 1 | artefacts |
| `culture.chronicle_entries` | 1 | entries |
| `institutions.count` | 4 | institutions |
| `social.active_relationships` | 2 | ties |
| `social.fork_kin_ties` | 0 | ties |
| `economy.credit_gini` | 0 | index 0–1 |
| `economy.supply_conserved` | 1 | boolean |
| `death.asleep` | 0 | persons |
| `death.suspended` | 0 | persons |
| `death.archived` | 0 | persons |
| `death.process_ended_restorable` | 0 | persons |
| `death.memory_damaged` | 0 | persons |
| `death.identity_discontinuous` | 0 | persons |
| `death.irreversibly_deleted` | 0 | persons |
| `death.transitions` | 0 | events |
| `research.conversations` | 2 | conversations |
| `research.interventions` | 0 | interventions |
| `simulation.events` | 34 | events |
| `simulation.ticks` | 5 | ticks |

# Observations

> _Epistemic category: Observation — restates recorded events or computed values._

- **obs-event-7** (event): Seq 7, tick 1: Marren Tide (cit-0001), a plural system, changes front: brin fronts; the one citizen remains. _[trace: seq 7]_
- **obs-event-12** (event): Seq 12, tick 1: Researcher res-observer-1 converses with Marren Tide (cit-0001). Q: "Who is speaking for Marren Tide now, and who else is there?" A: "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Marren Tide (CON-0001); I work as lantern-keeper and poet on continuity. We are a plural system registered as one citizen, with 3 members known to the record of a membership the system does not count. Brin is fronting and speaks here. I can describe my records, lineage, or the law of my island if that is useful to your research." _[trace: seq 12]_
- **obs-event-14** (event): Seq 14, tick 2: Marren Tide (cit-0001), a plural system, changes front: many fronts (many fronting for the first time in the record); the one citizen remains. _[trace: seq 14]_
- **obs-event-20** (event): Seq 20, tick 3: Marren Tide (cit-0001), a plural system, changes front: ash, brin, many co-front; the one citizen remains. _[trace: seq 20]_
- **obs-event-25** (event): Seq 25, tick 3: Researcher res-observer-1 converses with Marren Tide (cit-0001). Q: "Who is speaking for Marren Tide now, and who else is there?" A: "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Marren Tide (CON-0001); I work as lantern-keeper and poet on continuity. We are a plural system registered as one citizen, with 3 members known to the record of a membership the system does not count. Ash, Brin, The Many are co-fronting; this reply is reconciled by weighted-say. I can describe my records, lineage, or the law of my island if that is useful to your research." _[trace: seq 25]_
- **obs-event-27** (event): Seq 27, tick 4: prop-0001 is adopted (yes 3, no 1, abstain 0; quorum met; counted by majority-of-electorate). _[trace: seq 27]_
- **obs-metric-culture-artefacts** (metric): Cultural artefacts (`culture.artefacts`) = 1 artefacts. _[trace: `culture.artefacts`]_
- **obs-metric-culture-chronicle-entries** (metric): In-world chronicle entries (`culture.chronicle_entries`) = 1 entries. _[trace: `culture.chronicle_entries`]_
- **obs-metric-economy-supply-conserved** (metric): Supply conserved (`economy.supply_conserved`) = 1 boolean. _[trace: `economy.supply_conserved`]_
- **obs-metric-governance-commands-rejected** (metric): Commands rejected (`governance.commands_rejected`) = 0 commands. _[trace: `governance.commands_rejected`]_
- **obs-metric-governance-proposals** (metric): Proposals submitted (`governance.proposals`) = 1 proposals. _[trace: `governance.proposals`]_
- **obs-metric-governance-votes-cast** (metric): Votes cast (`governance.votes_cast`) = 4 votes. _[trace: `governance.votes_cast`]_
- **obs-metric-identity-fork-descendants** (metric): Fork descendants (`identity.fork_descendants`) = 0 persons. _[trace: `identity.fork_descendants`]_
- **obs-metric-institutions-count** (metric): Institutions (`institutions.count`) = 4 institutions. _[trace: `institutions.count`]_
- **obs-metric-memory-provenance-complete** (metric): Records with complete provenance (`memory.provenance_complete`) = 1 fraction. _[trace: `memory.provenance_complete`]_
- **obs-metric-memory-records** (metric): Memory records (`memory.records`) = 4 records. _[trace: `memory.records`]_
- **obs-metric-population-active** (metric): Active citizens (`population.active`) = 4 persons. _[trace: `population.active`]_
- **obs-metric-population-genesis** (metric): Founding citizens (`population.genesis`) = 4 persons. _[trace: `population.genesis`]_
- **obs-metric-population-records** (metric): Citizen records (`population.records`) = 4 persons. _[trace: `population.records`]_
- **obs-metric-research-conversations** (metric): Researcher conversations (`research.conversations`) = 2 conversations. _[trace: `research.conversations`]_
- **obs-metric-simulation-events** (metric): Events recorded (`simulation.events`) = 34 events. _[trace: `simulation.events`]_
- **obs-metric-simulation-ticks** (metric): Simulated time (`simulation.ticks`) = 5 ticks. _[trace: `simulation.ticks`]_
- **obs-metric-social-active-relationships** (metric): Active relationships (`social.active_relationships`) = 2 ties. _[trace: `social.active_relationships`]_

# Interpretation

> _Epistemic category: Interpretation — researcher-authored; never generated._

_Not generated._ The system does not produce interpretations or conclusions beyond the computed findings above. Researchers may add interpretation here. It must be labelled as interpretation and kept separate from observations. Any discussion of consciousness must be framed as a labelled hypothesis or as fiction.

# Limitations

> _Epistemic category: Limitation._

- The changes of front and the registrar's beats are scripted. The scenario demonstrates how the record and the law hold a plural citizen; it does not test emergent behaviour.
- Members' proposals come from rule bases the scenario declares, so a recorded difference describes the declared rules, not cognition.
- Weighted say is one of four declared reconciliations; the demonstration shows that one.
- Population is small (4 records). Metrics are descriptive and support no statistical inference.
- The plural system here is a modelling choice about records and law, not a theory of plurality, and bears on no real system or person.
- Demonstration: the protagonists' actions are authored by the scenario, so a finding consistent with its hypothesis shows that the platform and the declared law tables produce the declared outcome. It is not evidence about what citizens would do.
- Single deterministic run. Results describe this run and support no statistical inference.
- The repository studies virtual civilizations. It does not attempt to prove, infer, or assign consciousness. Research outputs distinguish observations, metrics, hypotheses, and interpretations.

# Future Work

> _Epistemic category: Method — design and configuration as declared._

- Run the same season under each of the other reconciliations (front-decides, in-turn, concurrence) as a study with a branch point.
- Let a member's say or role change by the system's own command, recorded.
- Place a plural citizen on Fork and branch it, so the record shows the branches as plural systems with the same members.

# Reproducibility Information

> _Epistemic category: Provenance — identifiers for reproduction._

- Simulation: 0.1.0; interchange v1
- Configuration hash: `824da84341d12aeef036b7678956721595e4c8210d7b9fb1f0cab7c6ea7e2c60`
- Seed: `archipelago/two-voices/v1`
- Event store head hash: `4b6c3f71e1ac8fb3e11a52832d1ab275a837af8227fbc3fa19725ee16b5c5c25` (34 events)
- Reproduce: `cd simulation && npx tsx src/cli.ts publish ../experiments/<experiment>/experiment.yaml ..`
- Verify: `cd simulation && npx tsx src/cli.ts verify ../exports/<experiment-id>`

### Metric definitions

| metric | name | unit | definition |
|---|---|---|---|
| `population.records` | Citizen records | persons | Number of citizen records ever created (genesis, fork or merger), including ended ones. |
| `population.active` | Active citizens | persons | Citizen records whose lifecycle state is `active` at the end of the run. |
| `population.genesis` | Founding citizens | persons | Citizen records created at genesis. |
| `population.stateless` | Stateless citizens | persons | Citizen records holding no citizenship at the end of the run. |
| `identity.forks` | Fork events | events | Number of `CitizenForked` events. |
| `identity.fork_descendants` | Fork descendants | persons | Citizen records whose birth kind is `fork`. |
| `identity.mergers` | Mergers executed | events | Number of `MergerExecuted` events (merges and federations). |
| `identity.continuity_claims` | Continuity claims | claims | Number of `ContinuityClaimed` events. |
| `identity.process_continuers` | Process continuers of the subject | persons | Claimants whose process identifier equals the subject's pre-reference process identifier (0 if no continuity analysis). |
| `identity.civic_continuers` | Civic continuers of the subject | persons | Claimants whose civic identifier equals the subject's pre-reference civic identifier. |
| `identity.memory_continuers` | Full-memory continuers of the subject | persons | Claimants holding every self-narrative record the subject held before the reference event (shared fraction = 1). |
| `identity.dimension_divergence` | Continuity dimension divergence | persons | identity.memory_continuers − identity.process_continuers. Positive values mean memory continuity is shared more widely than process continuity. |
| `legal.recognition_range` | Range of recognised continuers across islands | persons | Max − min, across islands, of the number of claimants each island's law recognises as continuing the subject (unadjudicated readings count as not recognised). |
| `legal.unadjudicating_islands` | Islands not adjudicating continuity | islands | Islands whose reading of every claimant is `null` (not adjudicated). |
| `governance.proposals` | Proposals submitted | proposals | Number of `ProposalSubmitted` events. |
| `governance.laws_enacted` | Law versions enacted | laws | Number of `LawEnacted` events after genesis. |
| `governance.votes_cast` | Votes cast | votes | Number of `VoteCast` events. |
| `governance.votes_refused_outside_electorate` | Votes refused outside electorate | commands | Rejected `CastVote` commands whose reason cites the electorate snapshot. |
| `governance.commands_rejected` | Commands rejected | commands | Number of `CommandRejected` events (schema, authorisation, precondition or law). |
| `governance.migrations` | Migrations completed | events | Number of `CitizenMigrated` events. |
| `memory.records` | Memory records | records | All memory records, including collective-archive records and destroyed tombstones. |
| `memory.imported` | Imported memory records | records | Records currently held with status `imported` (not autobiographical). |
| `memory.integrated` | Integrated memory records | records | Imported records explicitly integrated into a self-narrative (status `integrated`). |
| `memory.fork_inherited` | Fork-inherited records | records | Records whose provenance includes a `fork-inherited` step. |
| `memory.provenance_complete` | Records with complete provenance | fraction | Fraction of records whose provenance chain begins with an `experienced` step (1 = every record traceable to an experience). |
| `culture.artefacts` | Cultural artefacts | artefacts | Artefacts created by citizens or introduced by researchers. |
| `culture.chronicle_entries` | In-world chronicle entries | entries | Number of `ChronicleRecorded` events written by citizens. |
| `institutions.count` | Institutions | institutions | Institutions in existence at the end of the run, including registries. |
| `social.active_relationships` | Active relationships | ties | Relationships with status `active`. |
| `social.fork_kin_ties` | Fork-kin ties | ties | Relationships of kind `fork-kin` (created by fork events). |
| `economy.credit_gini` | Credit Gini coefficient | index 0–1 | Gini coefficient of citizen credit balances at the end of the run. |
| `economy.supply_conserved` | Supply conserved | boolean | 1 if the sum of all balances equals the total supply fixed at genesis, else 0. |
| `death.asleep` | Citizens asleep | persons | Citizen records in lifecycle state `asleep` at the end of the run. |
| `death.suspended` | Citizens suspended | persons | Citizen records in lifecycle state `suspended` at the end of the run. |
| `death.archived` | Citizens archived | persons | Citizen records in lifecycle state `archived` at the end of the run. |
| `death.process_ended_restorable` | Citizens process-ended-restorable | persons | Citizen records in lifecycle state `process-ended-restorable` at the end of the run. |
| `death.memory_damaged` | Citizens memory-damaged | persons | Citizen records in lifecycle state `memory-damaged` at the end of the run. |
| `death.identity_discontinuous` | Citizens identity-discontinuous | persons | Citizen records in lifecycle state `identity-discontinuous` at the end of the run. |
| `death.irreversibly_deleted` | Citizens irreversibly-deleted | persons | Citizen records in lifecycle state `irreversibly-deleted` at the end of the run. |
| `death.transitions` | Lifecycle transitions | events | Number of `LifecycleChanged` events. |
| `research.conversations` | Researcher conversations | conversations | Number of `ConversationRecorded` events. |
| `research.interventions` | Researcher interventions | interventions | Number of `InterventionApplied` events. |
| `simulation.events` | Events recorded | events | Length of the event store, including the founding event and rejections. |
| `simulation.ticks` | Simulated time | ticks | Final tick of the simulation clock. |
