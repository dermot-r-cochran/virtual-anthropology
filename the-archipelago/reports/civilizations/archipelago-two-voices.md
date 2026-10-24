# Virtual Anthropology Report: archipelago-two-voices

Experiment `two-voices-v1` · seed `archipelago/two-voices/v1` · head `4b6c3f71e1ac8fb3e11a52832d1ab275a837af8227fbc3fa19725ee16b5c5c25` · configuration `824da84341d12aeef036b7678956721595e4c8210d7b9fb1f0cab7c6ea7e2c60`

> The repository studies virtual civilizations. It does not attempt to prove, infer, or assign consciousness. Research outputs distinguish observations, metrics, hypotheses, and interpretations. Every value below is computed from the event store or the final snapshot. Section notes say which.

# Population

| measure | metric | value | unit |
|---|---|---:|---|
| Citizen records | `population.records` | 4 | persons |
| Active citizens | `population.active` | 4 | persons |
| Founding citizens | `population.genesis` | 4 | persons |
| Stateless citizens | `population.stateless` | 0 | persons |

| residence | citizens |
|---|---:|
| Continuity | 4 |
| Fork | 0 |
| Mnemosyne | 0 |
| Concord | 0 |

# Identity Structures

| citizen | name | birth | parents | lifecycle | residence |
|---|---|---|---|---|---|
| `cit-0001` | Marren Tide | genesis (seq 0) | — | active | Continuity |
| `cit-0002` | Odile Ferrant | genesis (seq 0) | — | active | Continuity |
| `cit-0003` | Teo Lask | genesis (seq 0) | — | active | Continuity |
| `cit-0004` | Hale Morrow | genesis (seq 0) | — | active | Continuity |

# Citizenship Models

_Island law at the end of the run (snapshot)._

| island | law v | doctrine | copying | memory exchange | merging | immigration | descendant citizenship | citizens |
|---|---:|---|---|---|---|---|---|---:|
| Continuity | 1 | single-continuous-process | prohibited | prohibited | prohibited | petition-review | none | 4 |
| Fork | 1 | branching-shared-history | permitted | permitted | prohibited | open | birth-island | 0 |
| Mnemosyne | 1 | memory-provenance | prohibited | permitted | prohibited | petition-review | none | 0 |
| Concord | 1 | consensual-federation | prohibited | permitted | consent-and-review | petition-review | none | 0 |

# Governance

| measure | metric | value | unit |
|---|---|---:|---|
| Proposals submitted | `governance.proposals` | 1 | proposals |
| Votes cast | `governance.votes_cast` | 4 | votes |
| Law versions enacted | `governance.laws_enacted` | 0 | laws |
| Votes refused outside electorate | `governance.votes_refused_outside_electorate` | 0 | commands |
| Commands rejected | `governance.commands_rejected` | 0 | commands |
| Migrations completed | `governance.migrations` | 0 | events |

| proposal | island | title | status |
|---|---|---|---|
| `prop-0001` | Continuity | Quay Lanterns Act | adopted |

# Culture

| measure | metric | value | unit |
|---|---|---:|---|
| Cultural artefacts | `culture.artefacts` | 1 | artefacts |
| In-world chronicle entries | `culture.chronicle_entries` | 1 | entries |

| artefact | kind | title | island | origin |
|---|---|---|---|---|
| `art-0001` | poem | A poem of Meridian Quay | Continuity | citizens |

# Institutions

| measure | metric | value | unit |
|---|---|---:|---|
| Institutions | `institutions.count` | 4 | institutions |

| institution | kind | island | members | founded at seq |
|---|---|---|---:|---:|
| Continuity Civic Registry | registry | Continuity | 1 | 0 |
| Fork Civic Registry | registry | Fork | 0 | 0 |
| Mnemosyne Civic Registry | registry | Mnemosyne | 0 | 0 |
| Concord Civic Registry | registry | Concord | 0 | 0 |

# Significant Historical Events

_From the chronicle. Each line cites its source events._

- Year 1: The Archipelago is founded. 4 citizens are registered across four islands. _[0:WorldFounded]_
- Year 2: First change of front: Marren Tide, a plural system, changes front: brin now fronts; the one citizen remains. _[7:FrontingChanged]_
- Year 3: Marren Tide, a plural system, changes front: many now fronts (many for the first time in the record); the one citizen remains. _[14:FrontingChanged]_
- Year 4: Marren Tide, a plural system, changes front: ash, brin, many now co-front; the one citizen remains. _[20:FrontingChanged]_
- Year 5: First law reform: Reform passed on Continuity: "Quay Lanterns Act" (3 yes, 1 no). _[27:ProposalClosed]_

# Identity Fork Statistics

| measure | metric | value | unit |
|---|---|---:|---|
| Fork events | `identity.forks` | 0 | events |
| Fork descendants | `identity.fork_descendants` | 0 | persons |
| Fork-kin ties | `social.fork_kin_ties` | 0 | ties |
| Fork-inherited records | `memory.fork_inherited` | 0 | records |
| Mergers executed | `identity.mergers` | 0 | events |
| Continuity claims | `identity.continuity_claims` | 0 | claims |
| Process continuers of the subject | `identity.process_continuers` | 0 | persons |
| Civic continuers of the subject | `identity.civic_continuers` | 0 | persons |
| Full-memory continuers of the subject | `identity.memory_continuers` | 0 | persons |
| Continuity dimension divergence | `identity.dimension_divergence` | 0 | persons |
| Range of recognised continuers across islands | `legal.recognition_range` | 0 | persons |

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

- 0 command(s) were rejected by validation, authorisation or law. 0 law version(s) were enacted. _[`governance.commands_rejected`, `governance.laws_enacted`]_
- The credit Gini coefficient is 0. Supply conserved = 1. _[`economy.credit_gini`, `economy.supply_conserved`]_
