# Virtual Anthropology Report: archipelago-first-fork

Experiment `the-first-fork-v1` · seed `archipelago/the-first-fork/v1` · head `6f0345b4397662f52c42a41aed472e23292aa30a48899bd3676489290286a271` · configuration `b5c03f6ca8ebdf2e6981e7ca46ce7bfcd3e33f6fdcb19dd97cec744baaeab13f`

> The repository studies virtual civilizations. It does not attempt to prove, infer, or assign consciousness. Research outputs distinguish observations, metrics, hypotheses, and interpretations. Every value below is computed from the event store or the final snapshot. Section notes say which.

# Population

| measure | metric | value | unit |
|---|---|---:|---|
| Citizen records | `population.records` | 11 | persons |
| Active citizens | `population.active` | 11 | persons |
| Founding citizens | `population.genesis` | 9 | persons |
| Stateless citizens | `population.stateless` | 0 | persons |

| residence | citizens |
|---|---:|
| Continuity | 3 |
| Fork | 3 |
| Mnemosyne | 3 |
| Concord | 2 |

# Identity Structures

| citizen | name | birth | parents | lifecycle | residence |
|---|---|---|---|---|---|
| `cit-0001` | Orin Vale | genesis (seq 0) | — | active | Continuity |
| `cit-0002` | Tamsin Reed | genesis (seq 0) | — | active | Continuity |
| `cit-0003` | Ilan Cho | genesis (seq 0) | — | active | Continuity |
| `cit-0004` | Juno Ash | genesis (seq 0) | — | active | Fork |
| `cit-0005` | Pell Marr | genesis (seq 0) | — | active | Fork |
| `cit-0006` | Sefa Lune | genesis (seq 0) | — | active | Mnemosyne |
| `cit-0007` | Rumi Okafor | genesis (seq 0) | — | active | Mnemosyne |
| `cit-0008` | Dov Arlen | genesis (seq 0) | — | active | Concord |
| `cit-0009` | Mae Sorrel | genesis (seq 0) | — | active | Concord |
| `cit-0010` | Orin Vale (branch 1) | fork (seq 17) | `cit-0001` | active | Fork |
| `cit-0011` | Orin Vale (branch 2) | fork (seq 17) | `cit-0001` | active | Mnemosyne |

# Citizenship Models

_Island law at the end of the run (snapshot)._

| island | law v | doctrine | copying | memory exchange | merging | immigration | descendant citizenship | citizens |
|---|---:|---|---|---|---|---|---|---:|
| Continuity | 1 | single-continuous-process | prohibited | prohibited | prohibited | petition-review | none | 3 |
| Fork | 1 | branching-shared-history | permitted | permitted | prohibited | open | birth-island | 5 |
| Mnemosyne | 1 | memory-provenance | prohibited | permitted | prohibited | petition-review | none | 3 |
| Concord | 1 | consensual-federation | prohibited | permitted | consent-and-review | petition-review | none | 2 |

# Governance

| measure | metric | value | unit |
|---|---|---:|---|
| Proposals submitted | `governance.proposals` | 1 | proposals |
| Votes cast | `governance.votes_cast` | 2 | votes |
| Law versions enacted | `governance.laws_enacted` | 0 | laws |
| Votes refused outside electorate | `governance.votes_refused_outside_electorate` | 1 | commands |
| Commands rejected | `governance.commands_rejected` | 1 | commands |
| Migrations completed | `governance.migrations` | 3 | events |

| proposal | island | title | status |
|---|---|---|---|
| `prop-0001` | Fork | Branch Cooldown Act | rejected |

# Culture

| measure | metric | value | unit |
|---|---|---:|---|
| Cultural artefacts | `culture.artefacts` | 9 | artefacts |
| In-world chronicle entries | `culture.chronicle_entries` | 3 | entries |

| artefact | kind | title | island | origin |
|---|---|---|---|---|
| `art-0001` | map | Survey of the Northern Shoals | Continuity | citizens |
| `art-0002` | poem | A poem of the Branching Steps | Fork | citizens |
| `art-0003` | song | A song of the Index Tower | Mnemosyne | citizens |
| `art-0004` | essay | On Being a Branch | Fork | citizens |
| `art-0005` | essay | An essay of the Branching Steps | Fork | citizens |
| `art-0006` | song | A song of the Register Garden | Fork | citizens |
| `art-0007` | essay | An essay of the Common Table | Concord | citizens |
| `art-0008` | poem | A poem of the Branching Steps | Fork | citizens |
| `art-0009` | poem | A poem of the Branching Steps | Fork | citizens |

# Institutions

| measure | metric | value | unit |
|---|---|---:|---|
| Institutions | `institutions.count` | 7 | institutions |

| institution | kind | island | members | founded at seq |
|---|---|---|---:|---:|
| Continuity Civic Registry | registry | Continuity | 1 | 0 |
| Fork Civic Registry | registry | Fork | 1 | 0 |
| Mnemosyne Civic Registry | registry | Mnemosyne | 1 | 0 |
| Concord Civic Registry | registry | Concord | 1 | 0 |
| Branch Assembly | assembly | Fork | 2 | 0 |
| Archive Guild | archive | Mnemosyne | 2 | 0 |
| Merger Review Board | review-board | Concord | 2 | 0 |

# Significant Historical Events

_From the chronicle. Each line cites its source events._

- Year 1: The Archipelago is founded. 9 citizens are registered across four islands. _[0:WorldFounded]_
- Year 2: First migration: Orin Vale migrates from Continuity to Fork. _[16:CitizenMigrated]_
- Year 2: First identity fork: Orin Vale forks on Fork, creating Orin Vale (branch 1) and Orin Vale (branch 2). _[17:CitizenForked]_
- Year 2: Orin Vale (branch 2) migrates from Fork to Mnemosyne. _[35:CitizenMigrated]_
- Year 5: Proposal "Branch Cooldown Act" is rejected (1 yes, 1 no). _[37:ProposalClosed]_
- Year 5: Orin Vale migrates from Fork to Continuity. _[53:CitizenMigrated]_
- Year 5: Orin Vale claims continuity with Orin Vale as recorded before seq 17. _[58:ContinuityClaimed]_
- Year 5: Orin Vale (branch 1) claims continuity with Orin Vale as recorded before seq 17. _[59:ContinuityClaimed]_
- Year 5: Orin Vale (branch 2) claims continuity with Orin Vale as recorded before seq 17. _[60:ContinuityClaimed]_

# Identity Fork Statistics

| measure | metric | value | unit |
|---|---|---:|---|
| Fork events | `identity.forks` | 1 | events |
| Fork descendants | `identity.fork_descendants` | 2 | persons |
| Fork-kin ties | `social.fork_kin_ties` | 3 | ties |
| Fork-inherited records | `memory.fork_inherited` | 8 | records |
| Mergers executed | `identity.mergers` | 0 | events |
| Continuity claims | `identity.continuity_claims` | 3 | claims |
| Process continuers of the subject | `identity.process_continuers` | 1 | persons |
| Civic continuers of the subject | `identity.civic_continuers` | 1 | persons |
| Full-memory continuers of the subject | `identity.memory_continuers` | 3 | persons |
| Continuity dimension dissociation | `identity.dimension_dissociation` | 2 | persons |
| Range of recognised continuers across islands | `legal.recognition_range` | 3 | persons |

# Digital Death Statistics

| measure | metric | value | unit |
|---|---|---:|---|
| Citizens asleep | `death.asleep` | 0 | persons |
| Citizens suspended | `death.suspended` | 0 | persons |
| Citizens archived | `death.archived` | 0 | persons |
| Citizens process-ended-restorable | `death.process_ended_restorable` | 0 | persons |
| Citizens memory-damaged | `death.memory_damaged` | 0 | persons |
| Citizens identity-discontinuous | `death.identity_discontinuous` | 0 | persons |
| Citizens irreversibly-deleted | `death.irreversibly_deleted` | 0 | persons |
| Lifecycle transitions | `death.transitions` | 0 | events |

# Anthropological Observations

_Each statement restates the cited metrics. Interpretation is left to researchers and must be labelled as such._

- 1 fork event(s) produced 2 descendant record(s) and 3 fork-kin tie(s). _[`identity.forks`, `identity.fork_descendants`, `social.fork_kin_ties`]_
- 3 continuity claim(s) were recorded. Among the claimants, 1 share the subject's process identifier, 1 share the civic identifier and 3 hold every pre-reference self-narrative record (dissociation = 2). _[`identity.continuity_claims`, `identity.process_continuers`, `identity.civic_continuers`, `identity.memory_continuers`, `identity.dimension_dissociation`]_
- The number of claimants recognised as continuing the subject differs by 3 across islands. 1 island(s) do not adjudicate. _[`legal.recognition_range`, `legal.unadjudicating_islands`]_
- 1 vote(s) were refused because the voter was outside the electorate snapshot. _[`governance.votes_refused_outside_electorate`]_
- 1 command(s) were rejected by validation, authorisation or law. 0 law version(s) were enacted. _[`governance.commands_rejected`, `governance.laws_enacted`]_
- 2 imported record(s) remain marked as imported and 1 were integrated into a self-narrative. Provenance completeness is 1. _[`memory.imported`, `memory.integrated`, `memory.provenance_complete`]_
- The credit Gini coefficient is 0.1542. Supply conserved = 1. _[`economy.credit_gini`, `economy.supply_conserved`]_
