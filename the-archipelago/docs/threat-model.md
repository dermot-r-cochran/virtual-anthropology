# Threat model

| Threat | Mitigation |
|---|---|
| Tampering with the history | Hash-chained log. `World.replay` and `cli verify` re-check every hash. `index.json` and `research_manifest.yaml` carry sha256 of every output. |
| LLM output mutating the world | Model output is only a proposal. Commands pass zod schema, authorization, preconditions and island law. Invariants are checked after each command. |
| Unregistered or over-reaching researchers | Researcher ids are registered at genesis. Interventions are budgeted. The bridge refuses unregistered ids, even for reads. |
| Manipulative or deceptive replies to humans | Disclosure guard and manipulation patterns. Blocked replies are recorded with flags. |
| Invented conclusions in reports | Findings and chronicles are generated only from metrics and events. Tests check the traceability of chronicle statements. |
| XSS in the static site | All data is HTML-escaped before rendering. A strict CSP allows no inline scripts or styles. |
| Bridge input abuse | Strict zod validation, length limits and bounded `step` rounds. The bridge runs over local stdio only, with no network listener. |
| Non-reproducible outputs | Seeded RNG, pinned head hash in the manifest, `SOURCE_DATE_EPOCH`, and a CI diff check. |

Out of scope: multi-tenant hosting, authentication of Evennia accounts beyond Evennia's own permissions (commands require `perm(Researcher)` or Builder), and adversarial LLM jailbreaks beyond pattern guards.
