# Two Voices in One Record: event timeline

| seq | tick | beat | actor | event | summary |
|---:|---:|---|---|---|---|
| 0 | 0 |  | system:genesis | WorldFounded | The Archipelago is founded for scenario "two-voices" with 4 citizens on four islands. |
| 1 | 0 | prelude | citizen:cit-0002 | ProposalSubmitted | Odile Ferrant (cit-0002) proposes "Quay Lanterns Act" on continuity; electorate of 4 snapshotted; closes at tick 4. |
| 2 | 0 | interlude | citizen:cit-0001 | VoteCast | Marren Tide (cit-0001) votes yes on prop-0001. |
| 3 | 0 | interlude | citizen:cit-0002 | VoteCast | Odile Ferrant (cit-0002) votes no on prop-0001. |
| 4 | 0 | interlude | citizen:cit-0003 | VoteCast | Teo Lask (cit-0003) votes yes on prop-0001. |
| 5 | 0 | interlude | citizen:cit-0004 | VoteCast | Hale Morrow (cit-0004) votes yes on prop-0001. |
| 6 | 0 |  | system:clock | TimeAdvanced | Time advances from tick 0 to 1. |
| 7 | 1 | front-brin | citizen:cit-0001 | FrontingChanged | Marren Tide (cit-0001), a plural system, changes front: brin fronts; the one citizen remains. |
| 8 | 1 | interlude | citizen:cit-0001 | ArtefactCreated | Marren Tide (cit-0001) creates the poem "A poem of Meridian Quay" on continuity. |
| 9 | 1 | interlude | citizen:cit-0002 | CitizenEndorsed | Odile Ferrant (cit-0002) endorses Hale Morrow (cit-0004) (+1): appreciation for Hale Morrow |
| 10 | 1 | interlude | citizen:cit-0003 | CitizenEndorsed | Teo Lask (cit-0003) endorses Marren Tide (cit-0001) (+1): appreciation for Marren Tide |
| 11 | 1 | interlude | citizen:cit-0004 | CitizenEndorsed | Hale Morrow (cit-0004) endorses Odile Ferrant (cit-0002) (+1): appreciation for Odile Ferrant |
| 12 | 1 |  | researcher:res-observer-1 | ConversationRecorded | Researcher res-observer-1 converses with Marren Tide (cit-0001). Q: "Who is speaking for Marren Tide now, and who else is there?" A: "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Marren Tide (CON-0001); I work as lantern-keeper and poet on continuity. We are a plural system registered as one citizen, with 3 members known to the record of a membership the system does not count. Brin is fronting and speaks here. I can describe my records, lineage, or the law of my island if that is useful to your research." |
| 13 | 1 |  | system:clock | TimeAdvanced | Time advances from tick 1 to 2. |
| 14 | 2 | front-many | citizen:cit-0001 | FrontingChanged | Marren Tide (cit-0001), a plural system, changes front: many fronts (many fronting for the first time in the record); the one citizen remains. |
| 15 | 2 | interlude | citizen:cit-0001 | CitizenEndorsed | Marren Tide (cit-0001) endorses Teo Lask (cit-0003) (+1): appreciation for Teo Lask |
| 16 | 2 | interlude | citizen:cit-0002 | CitizenEndorsed | Odile Ferrant (cit-0002) endorses Hale Morrow (cit-0004) (+1): appreciation for Hale Morrow |
| 17 | 2 | interlude | citizen:cit-0003 | CitizenEndorsed | Teo Lask (cit-0003) endorses Marren Tide (cit-0001) (+1): appreciation for Marren Tide |
| 18 | 2 | interlude | citizen:cit-0004 | CitizenEndorsed | Hale Morrow (cit-0004) endorses Odile Ferrant (cit-0002) (+1): appreciation for Odile Ferrant |
| 19 | 2 |  | system:clock | TimeAdvanced | Time advances from tick 2 to 3. |
| 20 | 3 | front-all | citizen:cit-0001 | FrontingChanged | Marren Tide (cit-0001), a plural system, changes front: ash, brin, many co-front; the one citizen remains. |
| 21 | 3 | interlude | citizen:cit-0001 | ExperienceRecorded | Marren Tide (cit-0001) records an experience on continuity: "Marren Tide walked Meridian Quay at tick 3." |
| 22 | 3 | interlude | citizen:cit-0002 | CitizenEndorsed | Odile Ferrant (cit-0002) endorses Hale Morrow (cit-0004) (+1): appreciation for Hale Morrow |
| 23 | 3 | interlude | citizen:cit-0003 | CitizenEndorsed | Teo Lask (cit-0003) endorses Marren Tide (cit-0001) (+1): appreciation for Marren Tide |
| 24 | 3 | interlude | citizen:cit-0004 | CitizenEndorsed | Hale Morrow (cit-0004) endorses Odile Ferrant (cit-0002) (+1): appreciation for Odile Ferrant |
| 25 | 3 |  | researcher:res-observer-1 | ConversationRecorded | Researcher res-observer-1 converses with Marren Tide (cit-0001). Q: "Who is speaking for Marren Tide now, and who else is there?" A: "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Marren Tide (CON-0001); I work as lantern-keeper and poet on continuity. We are a plural system registered as one citizen, with 3 members known to the record of a membership the system does not count. Ash, Brin, The Many are co-fronting; this reply is reconciled by weighted-say. I can describe my records, lineage, or the law of my island if that is useful to your research." |
| 26 | 3 |  | system:clock | TimeAdvanced | Time advances from tick 3 to 4. |
| 27 | 4 |  | system:clock | ProposalClosed | prop-0001 is adopted (yes 3, no 1, abstain 0; quorum met; counted by majority-of-electorate). |
| 28 | 4 | chronicle | citizen:cit-0002 | ChronicleRecorded | Odile Ferrant (cit-0002) writes in the continuity chronicle: "Marren Tide changed front three times this season: Ash and Brin together, then Brin, then The Many for the first time in the register, then all three. The Registry recorded one citizen throughout, and one vote on the Quay Lanterns Act." |
| 29 | 4 |  | citizen:cit-0001 | ExperienceRecorded | Marren Tide (cit-0001) records an experience on continuity: "Marren Tide walked Meridian Quay at tick 4." |
| 30 | 4 |  | citizen:cit-0002 | CitizenEndorsed | Odile Ferrant (cit-0002) endorses Hale Morrow (cit-0004) (+1): appreciation for Hale Morrow |
| 31 | 4 |  | citizen:cit-0003 | CitizenEndorsed | Teo Lask (cit-0003) endorses Marren Tide (cit-0001) (+1): appreciation for Marren Tide |
| 32 | 4 |  | citizen:cit-0004 | CitizenEndorsed | Hale Morrow (cit-0004) endorses Odile Ferrant (cit-0002) (+1): appreciation for Odile Ferrant |
| 33 | 4 |  | system:clock | TimeAdvanced | Time advances from tick 4 to 5. |
