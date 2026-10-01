# Glossary

- **Citizen / digital person**: a simulated agent with a civic record. It is an artificial agent, and the project makes no claim that it is conscious.
- **Island**: a jurisdiction with versioned law (Continuity, Fork, Mnemosyne, Concord).
- **Civic identity**: a registry identifier. Under Continuity law it is retained across suspension and restoration.
- **Process identity**: the identifier of the running process. A restore from archive starts a new process epoch.
- **Fork**: one citizen creates independent descendants. Shared history ends at the fork event. Votes and property do not duplicate.
- **Person-stage**: a citizen record split at a fork or merger. It is the node type of the lineage graph.
- **Continuity claim**: a citizen's testimony that it continues an earlier person-stage. It is evidence, never a determination.
- **Memory provenance**: the chain of actions on a memory record (experienced, contributed, imported, licensed, fork-inherited, integrated).
- **Imported / integrated memory**: imported records are not autobiographical. A record becomes integrated only by explicit adoption.
- **Merger / federation**: on Concord, consensual combination of identities. A merger also needs governance review. Mergers are either reversible or irreversible.
- **Proposal**: a yes/no/abstain referendum on one island, open to the electorate snapshotted when it was submitted (active citizens of that island; later forks cannot vote). The clock closes it; quorum is turnout over the electorate, then the island's **counting rule** decides: *majority-of-votes-cast* (yes over yes-plus-no must exceed the threshold; abstentions count toward quorum only; the founding rule everywhere), *majority-of-electorate* (yes over the whole snapshot must exceed the threshold; absence and abstention count against) or *consensus* (adopted only if no vote is cast against). Each island's founding rule follows its doctrine: Fork and Mnemosyne count votes cast (a branch, a record, each speaks for itself); Continuity counts the whole electorate (one unbroken body, and silence is not assent); Concord requires consensus (nothing combined without every consent). Quorum, threshold and counting rule are statutory law: amendable by proposal, variable in a study, and the closed-proposal event records the rule it was counted under.
- **Digital death states**: asleep, suspended, archived, process-ended-restorable, memory-damaged, identity-discontinuous, irreversibly-deleted.
- **Choice point**: a place where a mind had more than one option, recorded as (seq, citizen, label, occurrence, options, chosen). The default is always the first option in canonical order; there is no randomness in the simulation. A study's branch sweep takes each alternative as its own timeline, and a timeline variant may declare flips.
- **BDI**: the Belief–Desire–Intention agent architecture used by the deterministic minds.
- **Episode**: a memory recalled with what, where, when and who, plus source monitoring (lived, lived-by-ancestor, imported, licensed, integrated).
- **Identity-continuity event**: a projection of the log onto continuity dimensions (process, civic, lineage, memory, narrative, jurisdiction, testimony).
- **Interchange**: the stable contract between the simulation and the research layer.
- **Research manifest**: `research_manifest.yaml`, the authoritative provenance of one run.
