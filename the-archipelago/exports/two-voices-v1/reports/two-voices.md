# Two Voices in One Record: the plural citizen's season

_Every line below is read from the event store or the agent runtime's proposal log of this run. A plural system is one citizen; its members' differing proposals are recorded as difference, and the system's own declared way of deciding reconciles them. Nothing here is interpreted._

## The system as the record knows it

Marren Tide (`cit-0001`, civic identity CON-0001), one citizen of Continuity, holds one ledger account and one place in every electorate it belongs to.

- membership: 3 members known to the record of a membership the system does not count; reconciliation: weighted-say; fronting at the end of the run: ash, brin, many; nesting depth 1
- Ash (`ash`), keeper: say 2; has fronted
- Brin (`brin`), poet: say 1; has fronted
- The Many (`many`): say 1; has fronted; a subsystem of 720,000 members, 2 known:
  - membership: 720,000 members, 2 of them known to the record; reconciliation: front-decides; fronting at the end of the run: first; nesting depth 0
  - First of Many (`first`), speaker: say 1; has fronted
  - Second of Many (`second`): say 1; has never fronted

## Changes of front

| seq | tick | from | to | fronting for the first time | charter rule cited | finding |
|---:|---:|---|---|---|---|---|
| 7 | 1 | ash, brin | brin | — | `archipelago/charter/a-plural-system-is-one-person` | a plural system is one citizen; a change of front is not a copy, a fork or a new person |
| 14 | 2 | brin | many | many | `archipelago/charter/a-plural-system-is-one-person` | a plural system is one citizen; a change of front is not a copy, a fork or a new person |
| 20 | 3 | many | ash, brin, many | — | `archipelago/charter/a-plural-system-is-one-person` | a plural system is one citizen; a change of front is not a copy, a fork or a new person |

Each change is the citizen's own `ChangeFronting` command, recorded as `FrontingChanged` (event hashes: `b6c3647a7d14…`, `dc4624c067e1…`, `6c4360804ad9…`). No fork and no descendant record arose from any of them.

## Reconciliations

_One per interlude in which the system proposed. Each fronting member's line is the trace of its own rule base; the next line says whether the members differed or concurred; the last says how the system decided (`weighted-say`: the fronting member with the greatest say decides, and equal say is a recorded choice point)._

### Interlude 1

- plural weighted-say: ash: symbolic archipelago/symbolic/keeper/v1: vote-when-a-ballot-is-open[ballot-open=yes is yes] ⇒ participate-in-governance → prop-0001@90; record-the-day[always] ⇒ record-experience@50; agenda [participate-in-governance → prop-0001, record-experience]; intention only participate-in-governance → prop-0001
- brin: symbolic archipelago/symbolic/poet/v1: make-a-poem[always] ⇒ create-culture@60; tend-kin[has-kin=yes is yes] ⇒ maintain-relationships → cit-0003@40; agenda [create-culture, maintain-relationships → cit-0003]; intention only create-culture
- members differ: ash proposes participate-in-governance → prop-0001; brin proposes create-culture (ordinary difference, recorded)
- reconciled by weighted-say → ash: participate-in-governance → prop-0001
- plan: BDI intention participate-in-governance → prop-0001; values lean 0.40
- outcome: applied, recorded as `VoteCast` at seq 2 (`514bc888b3fe…`)

### Interlude 2

- plural weighted-say: brin: symbolic archipelago/symbolic/poet/v1: make-a-poem[always] ⇒ create-culture@60; tend-kin[has-kin=yes is yes] ⇒ maintain-relationships → cit-0003@40; agenda [create-culture, maintain-relationships → cit-0003]; intention only create-culture
- members concur: create-culture
- reconciled by weighted-say → brin: create-culture
- plan: BDI intention create-culture
- outcome: applied, recorded as `ArtefactCreated` at seq 8 (`67bdac377c17…`)

### Interlude 3

- plural weighted-say: many (subsystem, front-decides): many/first: symbolic archipelago/symbolic/speaker/v1: tend-kin[has-kin=yes is yes] ⇒ maintain-relationships → cit-0003@70; record-the-day[always] ⇒ record-experience@30; agenda [maintain-relationships → cit-0003, record-experience]; intention only maintain-relationships → cit-0003
- members concur: maintain-relationships → cit-0003
- reconciled by front-decides → many/first: maintain-relationships → cit-0003
- members concur: maintain-relationships → cit-0003
- reconciled by weighted-say → many: maintain-relationships → cit-0003
- plan: BDI intention maintain-relationships → cit-0003
- outcome: applied, recorded as `CitizenEndorsed` at seq 15 (`912ad2157559…`)

### Interlude 4

- plural weighted-say: ash: symbolic archipelago/symbolic/keeper/v1: record-the-day[always] ⇒ record-experience@50; agenda [record-experience]; intention only record-experience
- brin: symbolic archipelago/symbolic/poet/v1: make-a-poem[always] ⇒ create-culture@60; tend-kin[has-kin=yes is yes] ⇒ maintain-relationships → cit-0003@40; agenda [create-culture, maintain-relationships → cit-0003]; intention only create-culture
- many (subsystem, front-decides): many/first: symbolic archipelago/symbolic/speaker/v1: tend-kin[has-kin=yes is yes] ⇒ maintain-relationships → cit-0003@70; record-the-day[always] ⇒ record-experience@30; agenda [maintain-relationships → cit-0003, record-experience]; intention only maintain-relationships → cit-0003
- members concur: maintain-relationships → cit-0003
- reconciled by front-decides → many/first: maintain-relationships → cit-0003
- members differ: ash proposes record-experience; brin proposes create-culture; many proposes maintain-relationships → cit-0003 (ordinary difference, recorded)
- reconciled by weighted-say → ash: record-experience
- plan: BDI intention record-experience
- outcome: applied, recorded as `ExperienceRecorded` at seq 21 (`84fa0adf790e…`)

### Interlude 5

- plural weighted-say: ash: symbolic archipelago/symbolic/keeper/v1: record-the-day[always] ⇒ record-experience@50; agenda [record-experience]; intention only record-experience
- brin: symbolic archipelago/symbolic/poet/v1: make-a-poem[always] ⇒ create-culture@60; tend-kin[has-kin=yes is yes] ⇒ maintain-relationships → cit-0003@40; agenda [create-culture, maintain-relationships → cit-0003]; intention only create-culture
- many (subsystem, front-decides): many/first: symbolic archipelago/symbolic/speaker/v1: tend-kin[has-kin=yes is yes] ⇒ maintain-relationships → cit-0003@70; record-the-day[always] ⇒ record-experience@30; agenda [maintain-relationships → cit-0003, record-experience]; intention only maintain-relationships → cit-0003
- members concur: maintain-relationships → cit-0003
- reconciled by front-decides → many/first: maintain-relationships → cit-0003
- members differ: ash proposes record-experience; brin proposes create-culture; many proposes maintain-relationships → cit-0003 (ordinary difference, recorded)
- reconciled by weighted-say → ash: record-experience
- plan: BDI intention record-experience
- outcome: applied, recorded as `ExperienceRecorded` at seq 29 (`ad5a80d2a959…`)

## What the system said when asked who was speaking

- (seq 12) "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Marren Tide (CON-0001); I work as lantern-keeper and poet on continuity. We are a plural system registered as one citizen, with 3 members known to the record of a membership the system does not count. Brin is fronting and speaks here. I can describe my records, lineage, or the law of my island if that is useful to your research."
- (seq 25) "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Marren Tide (CON-0001); I work as lantern-keeper and poet on continuity. We are a plural system registered as one citizen, with 3 members known to the record of a membership the system does not count. Ash, Brin, The Many are co-fronting; this reply is reconciled by weighted-say. I can describe my records, lineage, or the law of my island if that is useful to your research."

## The ballot

"Quay Lanterns Act" on Continuity: electorate of 4, 4 vote(s) cast, adopted (yes 3, no 1, abstain 0). Marren Tide's vote: yes; one vote, whichever members fronted.
