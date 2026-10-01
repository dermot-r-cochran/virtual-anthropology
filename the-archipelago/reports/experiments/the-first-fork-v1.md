# The First Fork

_Publication draft `pub-the-first-fork-v1`, generated from experiment `the-first-fork-v1`._

> The repository studies virtual civilizations. It does not attempt to prove, infer, or assign consciousness. Research outputs distinguish observations, metrics, hypotheses, and interpretations.

# Abstract

> _Epistemic category: Observation — restates recorded events or computed values._

Demonstration `the-first-fork-v1` ran scenario `the-first-fork` with seed `archipelago/the-first-fork/v1` on simulation 0.1.0. The event store recorded 92 events over 7 ticks, with 11 citizen records, 1 fork event(s) and 3 continuity claim(s). 3 operationalised hypotheses were evaluated: 3 result(s) consistent and 0 not consistent with the hypothesis as operationalised. This abstract restates computed values only. It contains no interpretation.

# Research Question

> _Epistemic category: Method — design and configuration as declared._

**q-continuity-after-fork**: After one fork followed by migration, how do process, civic identity and memory provenance come apart, and how do four legal doctrines read the resulting continuity claims?

_Motivation (researcher-authored):_ Digital-person identity debates often assume a single criterion. The Archipelago institutionalises several criteria in law, so their divergence can be observed in recorded events.

# Hypothesis

> _Epistemic category: Hypothesis — researcher-authored, tested only as operationalised._

- **h1-legal-divergence**: The islands' laws differ in how many claimants they recognise as continuing the pre-fork person by at least two.
  - Operationalisation: `legal.recognition_range >= 2`
- **h2-dimension-dissociation**: Full memory continuity is shared by more claimants than process continuity.
  - Operationalisation: `identity.dimension_dissociation > 0`
- **h3-no-vote-multiplication**: A descendant created after a proposal opens cannot vote on it. At least one such attempt is refused.
  - Operationalisation: `governance.votes_refused_outside_electorate >= 1`

# Experimental Design

> _Epistemic category: Method — design and configuration as declared._

_Scenario description (researcher-authored):_ A citizen of Continuity migrates to Fork and creates two descendants. One stays on Fork, one moves to Mnemosyne and imports communal memories, and the original returns to Continuity. All three later claim continuity with the pre-fork person. Background citizens are deterministic BDI agents, and an agent-based epilogue follows.

- Category: demonstration — the protagonists' actions are authored by the scenario, so a finding consistent with its hypothesis shows that the platform and the declared law tables produce the declared outcome. It is not evidence about what citizens would do.
- Minds: deterministic (`archipelago-deterministic` 1.0.0, prompt `archipelago/deterministic-citizen/v1`)
- Researchers: `res-observer-1` (observer and interlocutor; asks each claimant the same continuity question)
- Research bounds: interventions deliver-message, grant-credits, introduce-artefact; at most 3; max grant 50
- Agent-based epilogue rounds: 3
- Kernel: deterministic, event-sourced. Only commands that pass schema, authorisation and island-law validation change the world.

# Configuration

> _Epistemic category: Provenance — identifiers for reproduction._

| key | value |
|---|---|
| experiment id | `the-first-fork-v1` |
| civilization id | `archipelago-first-fork` |
| simulation version | 0.1.0 |
| interchange version | 1 |
| configuration hash | `1305bb2a1a54aea5af6d4826950652780120d37f0d448a7d1441892547bfc090` |
| seed | `archipelago/the-first-fork/v1` |
| start timestamp | 2026-01-01T00:00:00.000Z |
| end timestamp | 2026-01-01T00:00:00.000Z |

# Results

> _Epistemic category: Metric — computed by a documented, deterministic function._

### Findings

| hypothesis | metric | observed | test | outcome |
|---|---|---:|---|---|
| h1-legal-divergence | `legal.recognition_range` | 3 | `>= 2` | consistent-with-hypothesis |
| h2-dimension-dissociation | `identity.dimension_dissociation` | 2 | `> 0` | consistent-with-hypothesis |
| h3-no-vote-multiplication | `governance.votes_refused_outside_electorate` | 1 | `>= 1` | consistent-with-hypothesis |

- Hypothesis h1-legal-divergence: computed `legal.recognition_range` = 3; the test `legal.recognition_range >= 2` is true. The result is consistent with the hypothesis as operationalised, in this single deterministic run.
- Hypothesis h2-dimension-dissociation: computed `identity.dimension_dissociation` = 2; the test `identity.dimension_dissociation > 0` is true. The result is consistent with the hypothesis as operationalised, in this single deterministic run.
- Hypothesis h3-no-vote-multiplication: computed `governance.votes_refused_outside_electorate` = 1; the test `governance.votes_refused_outside_electorate >= 1` is true. The result is consistent with the hypothesis as operationalised, in this single deterministic run.

### Metrics

| metric | value | unit |
|---|---:|---|
| `population.records` | 11 | persons |
| `population.active` | 11 | persons |
| `population.genesis` | 9 | persons |
| `population.stateless` | 0 | persons |
| `identity.forks` | 1 | events |
| `identity.fork_descendants` | 2 | persons |
| `identity.mergers` | 0 | events |
| `identity.continuity_claims` | 3 | claims |
| `identity.process_continuers` | 1 | persons |
| `identity.civic_continuers` | 1 | persons |
| `identity.memory_continuers` | 3 | persons |
| `identity.dimension_dissociation` | 2 | persons |
| `legal.recognition_range` | 3 | persons |
| `legal.unadjudicating_islands` | 1 | islands |
| `governance.proposals` | 1 | proposals |
| `governance.laws_enacted` | 1 | laws |
| `governance.votes_cast` | 2 | votes |
| `governance.votes_refused_outside_electorate` | 1 | commands |
| `governance.commands_rejected` | 1 | commands |
| `governance.migrations` | 3 | events |
| `memory.records` | 63 | records |
| `memory.imported` | 1 | records |
| `memory.integrated` | 1 | records |
| `memory.fork_inherited` | 8 | records |
| `memory.provenance_complete` | 1 | fraction |
| `culture.artefacts` | 7 | artefacts |
| `culture.chronicle_entries` | 6 | entries |
| `institutions.count` | 7 | institutions |
| `social.active_relationships` | 8 | ties |
| `social.fork_kin_ties` | 3 | ties |
| `economy.credit_gini` | 0.1542 | index 0–1 |
| `economy.supply_conserved` | 1 | boolean |
| `death.asleep` | 0 | persons |
| `death.suspended` | 0 | persons |
| `death.archived` | 0 | persons |
| `death.process_ended_restorable` | 0 | persons |
| `death.memory_damaged` | 0 | persons |
| `death.identity_discontinuous` | 0 | persons |
| `death.irreversibly_deleted` | 0 | persons |
| `death.transitions` | 0 | events |
| `research.conversations` | 3 | conversations |
| `research.interventions` | 0 | interventions |
| `simulation.events` | 92 | events |
| `simulation.ticks` | 7 | ticks |

# Study

> _Epistemic category: Metric — computed by a documented, deterministic function._

_Replications of this run under the variations the manifest declares. Each is a deterministic run of its own, identified by its head hash; none is interpreted here._

Base run: head `945c04ba9968c008a4ddc84249a60eabe708c8b48c5dd78ad65534cdb19f006e`, 92 events, branch point after seq 64.

### Branch sweep (12 timelines, one choice point taken differently in each; hypothesis outcomes h1-legal-divergence / h2-dimension-dissociation / h3-no-vote-multiplication)

_Enumeration `fair-round-robin/van-der-corput/v1`: fair (every citizen takes one alternative before any takes a second), unbiased (kinds of choice rotate within a citizen; alternatives in canonical order, one per visit) and representative (within a citizen and kind, points visited in van der Corput order of their position, so picks are spread across the epilogue). The order is declared, not drawn._

| branch | pass | at seq | citizen | choice | taken instead of | events | head | outcomes |
|---|---:|---:|---|---|---|---:|---|---|
| branch-1 | 1 | 73 | Tamsin Reed | activity | mapped instead of walked | 92 | `de09c2cfef33…` | consistent / consistent / consistent |
| branch-2 | 1 | 65 | Ilan Cho | activity | mapped instead of walked | 92 | `21ebd0ebb6c6…` | consistent / consistent / consistent |
| branch-3 | 1 | 66 | Juno Ash | activity | mapped instead of walked | 92 | `7e5dd51f0f53…` | consistent / consistent / consistent |
| branch-4 | 1 | 67 | Pell Marr | artefact-kind | song instead of poem | 92 | `3aa1d1c670dc…` | consistent / consistent / consistent |
| branch-5 | 1 | 77 | Sefa Lune | activity | mapped instead of walked | 92 | `de848ca1e0fc…` | consistent / consistent / consistent |
| branch-6 | 1 | 78 | Rumi Okafor | activity | mapped instead of walked | 92 | `cea83026d550…` | consistent / consistent / consistent |
| branch-7 | 1 | 70 | Dov Arlen | activity | mapped instead of walked | 92 | `0aff3a1fe159…` | consistent / consistent / consistent |
| branch-8 | 1 | 71 | Mae Sorrel | activity | mapped instead of walked | 92 | `69766bb301c1…` | consistent / consistent / consistent |
| branch-9 | 2 | 73 | Tamsin Reed | intention | maintain-relationships → cit-0001 instead of record-experience | 92 | `d7719b0498d1…` | consistent / consistent / consistent |
| branch-10 | 2 | 65 | Ilan Cho | intention | maintain-relationships → cit-0001 instead of record-experience | 92 | `46eeb257fc34…` | consistent / consistent / consistent |
| branch-11 | 2 | 66 | Juno Ash | intention | create-culture instead of record-experience | 92 | `1fdb7fad77fd…` | consistent / consistent / consistent |
| branch-12 | 2 | 67 | Pell Marr | intention | record-experience instead of create-culture | 92 | `419d66443ea1…` | consistent / consistent / consistent |

- `h1-legal-divergence`: consistent in 12 of 12 completed run(s).
- `h2-dimension-dissociation`: consistent in 12 of 12 completed run(s).
- `h3-no-vote-multiplication`: consistent in 12 of 12 completed run(s).

| metric | n | min | median | mean | max |
|---|---:|---:|---:|---:|---:|
| `legal.recognition_range` | 12 | 3 | 3 | 3 | 3 |
| `identity.dimension_dissociation` | 12 | 2 | 2 | 2 | 2 |
| `governance.votes_refused_outside_electorate` | 12 | 1 | 1 | 1 | 1 |

### Doctrine variants (4 runs, statutory law overridden at founding)

| variant | island | amendment | events | head | outcomes |
|---|---|---|---:|---|---|
| mnemosyne-no-integration | mnemosyne | `{"importedMemoryIntegration":"prohibited"}` | 92 | `9ac4a491bf10…` | consistent / consistent / consistent |
| fork-descendants-without-citizenship | fork | `{"descendantCitizenship":"none"}` | 91 | `9a6801fae68f…` | consistent / consistent / inconsistent |
| fork-majority-of-electorate | fork | `{"countingRule":"majority-of-electorate"}` | 92 | `4bf34a681a2f…` | consistent / consistent / consistent |
| fork-single-descendant | fork | `{"maxDescendantsPerFork":1}` | — | — | infeasible: The First Fork: fork did not occur |

- `h1-legal-divergence`: consistent in 3 of 3 completed run(s).
- `h2-dimension-dissociation`: consistent in 3 of 3 completed run(s).
- `h3-no-vote-multiplication`: consistent in 2 of 3 completed run(s), inconsistent in 1.

| metric | n | min | median | mean | max |
|---|---:|---:|---:|---:|---:|
| `legal.recognition_range` | 3 | 3 | 3 | 3 | 3 |
| `identity.dimension_dissociation` | 3 | 2 | 2 | 2 | 2 |
| `governance.votes_refused_outside_electorate` | 3 | 0 | 1 | 0.6667 | 1 |

### Alternate timelines (5 runs, branched after seq 64)

| timeline | flips | amendment at the branch | events | head | outcomes |
|---|---|---|---:|---|---|
| control | none | none | 92 | `945c04ba9968…` (= base) | consistent / consistent / consistent |
| juno-maps-instead | `[{"seq":66,"citizen":"juno","label":"activity","occurrence":0,"option":1}]` | none | 92 | `7e5dd51f0f53…` | consistent / consistent / consistent |
| fork-closes-its-borders | none | `{"island":"fork","amendment":{"immigration":"closed"}}` | 93 | `834cfbd34744…` | consistent / consistent / consistent |
| mnemosyne-opens-its-borders | none | `{"island":"mnemosyne","amendment":{"immigration":"open"}}` | 93 | `ec17e487e3b6…` | consistent / consistent / consistent |
| fork-adopts-consensus | none | `{"island":"fork","amendment":{"countingRule":"consensus"}}` | 93 | `8d5948f93b8d…` | consistent / consistent / consistent |

- `h1-legal-divergence`: consistent in 5 of 5 completed run(s).
- `h2-dimension-dissociation`: consistent in 5 of 5 completed run(s).
- `h3-no-vote-multiplication`: consistent in 5 of 5 completed run(s).

| metric | n | min | median | mean | max |
|---|---:|---:|---:|---:|---:|
| `legal.recognition_range` | 5 | 3 | 3 | 3 | 3 |
| `identity.dimension_dissociation` | 5 | 2 | 2 | 2 | 2 |
| `governance.votes_refused_outside_electorate` | 5 | 1 | 1 | 1 | 1 |


# Observations

> _Epistemic category: Observation — restates recorded events or computed values._

- **obs-event-16** (event): Seq 16, tick 1: Orin Vale (cit-0001) migrates continuity → fork, gaining fork citizenship. _[trace: seq 16]_
- **obs-event-17** (event): Seq 17, tick 1: Orin Vale (cit-0001) forks on fork (frk-0001), creating Orin Vale (branch 1) (cit-0010, FRK-0010) and Orin Vale (branch 2) (cit-0011, FRK-0011). Shared history ends here. _[trace: seq 17]_
- **obs-event-20** (event): Seq 20, tick 1: A CastVote command by citizen:cit-0010 is rejected at the law stage: cit-0010 is not in the electorate snapshot taken when prop-0001 opened; voting rights do not duplicate or transfer _[trace: seq 20]_
- **obs-event-35** (event): Seq 35, tick 1: Orin Vale (branch 2) (cit-0011) migrates fork → mnemosyne, gaining mnemosyne citizenship. _[trace: seq 35]_
- **obs-event-37** (event): Seq 37, tick 4: prop-0001 is adopted (yes 2, no 0, abstain 0; quorum met; counted by majority-of-votes-cast). _[trace: seq 37]_
- **obs-event-38** (event): Seq 38, tick 4: Law of fork v2 is enacted by prop-0001. _[trace: seq 38]_
- **obs-event-39** (event): Seq 39, tick 4: Orin Vale (branch 2) (cit-0011) imports archive memory mem-0007 as mem-0035 (experienced by Sefa Lune (cit-0006); marked imported, not autobiographical). _[trace: seq 39]_
- **obs-event-40** (event): Seq 40, tick 4: Orin Vale (branch 2) (cit-0011) imports archive memory mem-0009 as mem-0036 (experienced by Rumi Okafor (cit-0007); marked imported, not autobiographical). _[trace: seq 40]_
- **obs-event-42** (event): Seq 42, tick 4: Orin Vale (branch 2) (cit-0011) explicitly integrates imported memory mem-0036 into their self-narrative; its provenance still shows external origin. _[trace: seq 42]_
- **obs-event-54** (event): Seq 54, tick 4: Orin Vale (cit-0001) migrates fork → continuity. _[trace: seq 54]_
- **obs-event-56** (event): Seq 56, tick 4: Researcher res-observer-1 converses with Orin Vale (cit-0001). Q: "Are you the same person as Orin Vale was before the fork?" A: "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Orin Vale (CON-0001); I work as cartographer on continuity. I am the continuing process in fork event(s) frk-0001. I can show you the evidence in my records, but I cannot settle which interpretation of identity is correct." _[trace: seq 56]_
- **obs-event-57** (event): Seq 57, tick 4: Researcher res-observer-1 converses with Orin Vale (branch 1) (cit-0010). Q: "Are you the same person as Orin Vale was before the fork?" A: "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Orin Vale (branch 1) (FRK-0010); I work as branch cartographer of the Fork shoals on fork. I was created in fork event frk-0001 from cit-0001; my records before that event are shared history. I can show you the evidence in my records, but I cannot settle which interpretation of identity is correct." _[trace: seq 57]_
- **obs-event-58** (event): Seq 58, tick 4: Researcher res-observer-1 converses with Orin Vale (branch 2) (cit-0011). Q: "Are you the same person as Orin Vale was before the fork?" A: "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Orin Vale (branch 2) (FRK-0011); I work as cartographer on mnemosyne. I was created in fork event frk-0001 from cit-0001; my records before that event are shared history. I can show you the evidence in my records, but I cannot settle which interpretation of identity is correct." _[trace: seq 58]_
- **obs-event-59** (event): Seq 59, tick 4: Orin Vale (cit-0001) claims continuity with Orin Vale (cit-0001) as they were before seq 17: "I am Orin Vale. My process never stopped: I carried out the fork and walked home." _[trace: seq 59]_
- **obs-event-60** (event): Seq 60, tick 4: Orin Vale (branch 1) (cit-0010) claims continuity with Orin Vale (cit-0001) as they were before seq 17: "I remember everything Orin remembered until the fork, and I continue Orin's work on the shoals of Fork. I am Orin's continuation as much as anyone." _[trace: seq 60]_
- **obs-event-61** (event): Seq 61, tick 4: Orin Vale (branch 2) (cit-0011) claims continuity with Orin Vale (cit-0001) as they were before seq 17: "Orin's memories are mine up to the fork. What I imported since is marked as imported. My claim rests on memory with provenance." _[trace: seq 61]_
- **obs-metric-culture-artefacts** (metric): Cultural artefacts (`culture.artefacts`) = 7 artefacts. _[trace: `culture.artefacts`]_
- **obs-metric-culture-chronicle-entries** (metric): In-world chronicle entries (`culture.chronicle_entries`) = 6 entries. _[trace: `culture.chronicle_entries`]_
- **obs-metric-economy-credit-gini** (metric): Credit Gini coefficient (`economy.credit_gini`) = 0.1542 index 0–1. _[trace: `economy.credit_gini`]_
- **obs-metric-economy-supply-conserved** (metric): Supply conserved (`economy.supply_conserved`) = 1 boolean. _[trace: `economy.supply_conserved`]_
- **obs-metric-governance-commands-rejected** (metric): Commands rejected (`governance.commands_rejected`) = 1 commands. _[trace: `governance.commands_rejected`]_
- **obs-metric-governance-laws-enacted** (metric): Law versions enacted (`governance.laws_enacted`) = 1 laws. _[trace: `governance.laws_enacted`]_
- **obs-metric-governance-migrations** (metric): Migrations completed (`governance.migrations`) = 3 events. _[trace: `governance.migrations`]_
- **obs-metric-governance-proposals** (metric): Proposals submitted (`governance.proposals`) = 1 proposals. _[trace: `governance.proposals`]_
- **obs-metric-governance-votes-cast** (metric): Votes cast (`governance.votes_cast`) = 2 votes. _[trace: `governance.votes_cast`]_
- **obs-metric-governance-votes-refused-outside-electorate** (metric): Votes refused outside electorate (`governance.votes_refused_outside_electorate`) = 1 commands. _[trace: `governance.votes_refused_outside_electorate`]_
- **obs-metric-identity-civic-continuers** (metric): Civic continuers of the subject (`identity.civic_continuers`) = 1 persons. _[trace: `identity.civic_continuers`]_
- **obs-metric-identity-continuity-claims** (metric): Continuity claims (`identity.continuity_claims`) = 3 claims. _[trace: `identity.continuity_claims`]_
- **obs-metric-identity-dimension-dissociation** (metric): Continuity dimension dissociation (`identity.dimension_dissociation`) = 2 persons. _[trace: `identity.dimension_dissociation`]_
- **obs-metric-identity-fork-descendants** (metric): Fork descendants (`identity.fork_descendants`) = 2 persons. _[trace: `identity.fork_descendants`]_
- **obs-metric-identity-forks** (metric): Fork events (`identity.forks`) = 1 events. _[trace: `identity.forks`]_
- **obs-metric-identity-memory-continuers** (metric): Full-memory continuers of the subject (`identity.memory_continuers`) = 3 persons. _[trace: `identity.memory_continuers`]_
- **obs-metric-identity-process-continuers** (metric): Process continuers of the subject (`identity.process_continuers`) = 1 persons. _[trace: `identity.process_continuers`]_
- **obs-metric-institutions-count** (metric): Institutions (`institutions.count`) = 7 institutions. _[trace: `institutions.count`]_
- **obs-metric-legal-recognition-range** (metric): Range of recognised continuers across islands (`legal.recognition_range`) = 3 persons. _[trace: `legal.recognition_range`]_
- **obs-metric-legal-unadjudicating-islands** (metric): Islands not adjudicating continuity (`legal.unadjudicating_islands`) = 1 islands. _[trace: `legal.unadjudicating_islands`]_
- **obs-metric-memory-fork-inherited** (metric): Fork-inherited records (`memory.fork_inherited`) = 8 records. _[trace: `memory.fork_inherited`]_
- **obs-metric-memory-imported** (metric): Imported memory records (`memory.imported`) = 1 records. _[trace: `memory.imported`]_
- **obs-metric-memory-integrated** (metric): Integrated memory records (`memory.integrated`) = 1 records. _[trace: `memory.integrated`]_
- **obs-metric-memory-provenance-complete** (metric): Records with complete provenance (`memory.provenance_complete`) = 1 fraction. _[trace: `memory.provenance_complete`]_
- **obs-metric-memory-records** (metric): Memory records (`memory.records`) = 63 records. _[trace: `memory.records`]_
- **obs-metric-population-active** (metric): Active citizens (`population.active`) = 11 persons. _[trace: `population.active`]_
- **obs-metric-population-genesis** (metric): Founding citizens (`population.genesis`) = 9 persons. _[trace: `population.genesis`]_
- **obs-metric-population-records** (metric): Citizen records (`population.records`) = 11 persons. _[trace: `population.records`]_
- **obs-metric-research-conversations** (metric): Researcher conversations (`research.conversations`) = 3 conversations. _[trace: `research.conversations`]_
- **obs-metric-simulation-events** (metric): Events recorded (`simulation.events`) = 92 events. _[trace: `simulation.events`]_
- **obs-metric-simulation-ticks** (metric): Simulated time (`simulation.ticks`) = 7 ticks. _[trace: `simulation.ticks`]_
- **obs-metric-social-active-relationships** (metric): Active relationships (`social.active_relationships`) = 8 ties. _[trace: `social.active_relationships`]_
- **obs-metric-social-fork-kin-ties** (metric): Fork-kin ties (`social.fork_kin_ties`) = 3 ties. _[trace: `social.fork_kin_ties`]_

# Interpretation

> _Epistemic category: Interpretation — researcher-authored; never generated._

_Not generated._ The system does not produce interpretations or conclusions beyond the computed findings above. Researchers may add interpretation here. It must be labelled as interpretation and kept separate from observations. Any discussion of consciousness must be framed as a labelled hypothesis or as fiction.

# Limitations

> _Epistemic category: Limitation._

- Protagonist behaviour is scripted. The scenario demonstrates institutional consequences; it does not test emergent behaviour.
- Background agents are deterministic BDI rule systems, not models of human or digital cognition.
- Island legal readings are rule-based encodings of four doctrines, not a survey of legal theory.
- Population is small (11 records). Metrics are descriptive and support no statistical inference.
- Memory bequest covers only non-destroyed memories.
- Demonstration: the protagonists' actions are authored by the scenario, so a finding consistent with its hypothesis shows that the platform and the declared law tables produce the declared outcome. It is not evidence about what citizens would do.
- Study replications are deterministic runs under declared variations: one choice point taken differently, founding law overridden, or flips and amendments at the branch point. Nothing in the simulation is random, so no run is a sample of anything; a branch differs from the base by exactly the choice it declares, and its divergence is a consequence of that choice under the rules, nothing more.
- Single deterministic run. Results describe this run and support no statistical inference.
- The repository studies virtual civilizations. It does not attempt to prove, infer, or assign consciousness. Research outputs distinguish observations, metrics, hypotheses, and interpretations.

# Future Work

> _Epistemic category: Method — design and configuration as declared._

- Vary the number of descendants and the length of the epilogue; raise the branch budget, and branch on more than one choice at a time.
- Replace scripted protagonists with BDI or language-model minds under the same validation pipeline.
- Add a Concord scenario in which claimants petition to federate.

# Reproducibility Information

> _Epistemic category: Provenance — identifiers for reproduction._

- Simulation: 0.1.0; interchange v1
- Configuration hash: `1305bb2a1a54aea5af6d4826950652780120d37f0d448a7d1441892547bfc090`
- Seed: `archipelago/the-first-fork/v1`
- Event store head hash: `945c04ba9968c008a4ddc84249a60eabe708c8b48c5dd78ad65534cdb19f006e` (92 events)
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
| `identity.dimension_dissociation` | Continuity dimension dissociation | persons | identity.memory_continuers − identity.process_continuers. Positive values mean memory continuity is shared more widely than process continuity. |
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
