# The First Fork: event timeline

| seq | tick | beat | actor | event | summary |
|---:|---:|---|---|---|---|
| 0 | 0 |  | system:genesis | WorldFounded | The Archipelago is founded for scenario "the-first-fork" with 9 citizens on four islands. |
| 1 | 0 | prelude | citizen:cit-0001 | ExperienceRecorded | Orin Vale (cit-0001) records an experience on continuity: "Charted a channel through the outer shoals that no one had mapped." |
| 2 | 0 | prelude | citizen:cit-0001 | ArtefactCreated | Orin Vale (cit-0001) creates the map "Survey of the Northern Shoals" on continuity. |
| 3 | 0 | prelude | citizen:cit-0004 | ProposalSubmitted | Juno Ash (cit-0004) proposes "Branch Cooldown Act" on fork; electorate of 2 snapshotted; closes at tick 4. |
| 4 | 0 | interlude | citizen:cit-0002 | ExperienceRecorded | Tamsin Reed (cit-0002) records an experience on continuity: "Tamsin Reed walked Meridian Quay at tick 0." |
| 5 | 0 | interlude | citizen:cit-0003 | ExperienceRecorded | Ilan Cho (cit-0003) records an experience on continuity: "Ilan Cho walked Meridian Quay at tick 0." |
| 6 | 0 | interlude | citizen:cit-0004 | VoteCast | Juno Ash (cit-0004) votes yes on prop-0001. |
| 7 | 0 | interlude | citizen:cit-0005 | VoteCast | Pell Marr (cit-0005) votes yes on prop-0001. |
| 8 | 0 | interlude | citizen:cit-0006 | ExperienceRecorded | Sefa Lune (cit-0006) records an experience on mnemosyne: "Sefa Lune walked the Reading Shore at tick 0." |
| 9 | 0 | interlude | citizen:cit-0007 | ExperienceRecorded | Rumi Okafor (cit-0007) records an experience on mnemosyne: "Rumi Okafor walked the Reading Shore at tick 0." |
| 10 | 0 | interlude | citizen:cit-0008 | ExperienceRecorded | Dov Arlen (cit-0008) records an experience on concord: "Dov Arlen walked the Accord Bridge at tick 0." |
| 11 | 0 | interlude | citizen:cit-0009 | ExperienceRecorded | Mae Sorrel (cit-0009) records an experience on concord: "Mae Sorrel walked the Accord Bridge at tick 0." |
| 12 | 0 |  | system:clock | TimeAdvanced | Time advances from tick 0 to 1. |
| 13 | 1 | petition-to-fork | citizen:cit-0001 | MigrationPetitioned | Orin Vale (cit-0001) petitions to migrate continuity → fork: "To study branching law where it is practised, and perhaps to branch." |
| 14 | 1 |  | system:registry:continuity | PetitionReviewed | The continuity registry approved the exit side of pet-0001 under law v1. Findings: emigration permitted; advisory: copies made outside continuity never inherit civic identity CON-0001; the civic identity follows the one continuous process. |
| 15 | 1 |  | system:registry:fork | PetitionReviewed | The fork registry approved the entry side of pet-0001 under law v1. Findings: descendants created here will each receive a separate identity. |
| 16 | 1 | migrate-to-fork | citizen:cit-0001 | CitizenMigrated | Orin Vale (cit-0001) migrates continuity → fork, gaining fork citizenship. |
| 17 | 1 | the-fork | citizen:cit-0001 | CitizenForked | Orin Vale (cit-0001) forks on fork (frk-0001), creating Orin Vale (branch 1) (cit-0010, FRK-0010) and Orin Vale (branch 2) (cit-0011, FRK-0011). Shared history ends here. |
| 18 | 1 | endowment | citizen:cit-0001 | CreditsTransferred | 20 credits move from citizen:cit-0001 to citizen:cit-0010 (explicit endowment to a branch; property does not duplicate). |
| 19 | 1 | endowment | citizen:cit-0001 | CreditsTransferred | 20 credits move from citizen:cit-0001 to citizen:cit-0011 (explicit endowment to a branch; property does not duplicate). |
| 20 | 1 | endowment | citizen:cit-0010 | CommandRejected | A CastVote command by citizen:cit-0010 is rejected at the law stage: cit-0010 is not in the electorate snapshot taken when prop-0001 opened; voting rights do not duplicate or transfer |
| 21 | 1 | interlude | citizen:cit-0002 | ExperienceRecorded | Tamsin Reed (cit-0002) records an experience on continuity: "Tamsin Reed walked Meridian Quay at tick 1." |
| 22 | 1 | interlude | citizen:cit-0003 | ExperienceRecorded | Ilan Cho (cit-0003) records an experience on continuity: "Ilan Cho walked Meridian Quay at tick 1." |
| 23 | 1 | interlude | citizen:cit-0004 | ExperienceRecorded | Juno Ash (cit-0004) records an experience on fork: "Juno Ash walked the split harbour at tick 1." |
| 24 | 1 | interlude | citizen:cit-0005 | ArtefactCreated | Pell Marr (cit-0005) creates the poem "A poem of the split harbour" on fork. |
| 25 | 1 | interlude | citizen:cit-0006 | ExperienceRecorded | Sefa Lune (cit-0006) records an experience on mnemosyne: "Sefa Lune walked the Reading Shore at tick 1." |
| 26 | 1 | interlude | citizen:cit-0007 | ExperienceRecorded | Rumi Okafor (cit-0007) records an experience on mnemosyne: "Rumi Okafor walked the Reading Shore at tick 1." |
| 27 | 1 | interlude | citizen:cit-0008 | ExperienceRecorded | Dov Arlen (cit-0008) records an experience on concord: "Dov Arlen walked the Accord Bridge at tick 1." |
| 28 | 1 | interlude | citizen:cit-0009 | ExperienceRecorded | Mae Sorrel (cit-0009) records an experience on concord: "Mae Sorrel walked the Accord Bridge at tick 1." |
| 29 | 1 | branch-life | citizen:cit-0010 | ExperienceRecorded | Orin Vale (branch 1) (cit-0010) records an experience on fork: "First morning as a branch: the Register Garden had a new bed with my name on it." |
| 30 | 1 | branch-life | citizen:cit-0010 | OccupationChanged | Orin Vale (branch 1) (cit-0010) changes occupation from cartographer to branch cartographer of the Fork shoals. |
| 31 | 1 | branch-life | citizen:cit-0010 | ArtefactCreated | Orin Vale (branch 1) (cit-0010) creates the essay "On Being a Branch" on fork. |
| 32 | 1 | branch-life | citizen:cit-0011 | MigrationPetitioned | Orin Vale (branch 2) (cit-0011) petitions to migrate fork → mnemosyne: "To study the provenance of memory among the archivists." |
| 33 | 1 |  | system:registry:fork | PetitionReviewed | The fork registry approved the exit side of pet-0002 under law v1. Findings: emigration permitted. |
| 34 | 1 |  | system:registry:mnemosyne | PetitionReviewed | The mnemosyne registry approved the entry side of pet-0002 under law v1. Findings: the applicant's memory holdings will be subject to provenance disclosure. |
| 35 | 1 | to-mnemosyne | citizen:cit-0011 | CitizenMigrated | Orin Vale (branch 2) (cit-0011) migrates fork → mnemosyne, gaining mnemosyne citizenship. |
| 36 | 1 |  | system:clock | TimeAdvanced | Time advances from tick 1 to 4. |
| 37 | 4 |  | system:clock | ProposalClosed | prop-0001 is adopted (yes 2, no 0, abstain 0; quorum met; counted by majority-of-votes-cast). |
| 38 | 4 |  | system:clock | LawEnacted | Law of fork v2 is enacted by prop-0001. |
| 39 | 4 | imports | citizen:cit-0011 | MemoryImported | Orin Vale (branch 2) (cit-0011) imports archive memory mem-0007 as mem-0035 (experienced by Sefa Lune (cit-0006); marked imported, not autobiographical). |
| 40 | 4 | imports | citizen:cit-0011 | MemoryImported | Orin Vale (branch 2) (cit-0011) imports archive memory mem-0009 as mem-0036 (experienced by Rumi Okafor (cit-0007); marked imported, not autobiographical). |
| 41 | 4 | imports | citizen:cit-0011 | ExperienceRecorded | Orin Vale (branch 2) (cit-0011) records an experience on mnemosyne: "Read my own pre-fork charts in the Stacks and found them both strange and familiar." |
| 42 | 4 | integrate | citizen:cit-0011 | MemoryIntegrated | Orin Vale (branch 2) (cit-0011) explicitly integrates imported memory mem-0036 into their self-narrative; its provenance still shows external origin. |
| 43 | 4 | interlude | citizen:cit-0002 | ExperienceRecorded | Tamsin Reed (cit-0002) records an experience on continuity: "Tamsin Reed walked Meridian Quay at tick 4." |
| 44 | 4 | interlude | citizen:cit-0003 | ExperienceRecorded | Ilan Cho (cit-0003) records an experience on continuity: "Ilan Cho walked Meridian Quay at tick 4." |
| 45 | 4 | interlude | citizen:cit-0004 | ExperienceRecorded | Juno Ash (cit-0004) records an experience on fork: "Juno Ash walked the split harbour at tick 4." |
| 46 | 4 | interlude | citizen:cit-0005 | ArtefactCreated | Pell Marr (cit-0005) creates the poem "A poem of the split harbour" on fork. |
| 47 | 4 | interlude | citizen:cit-0006 | ExperienceRecorded | Sefa Lune (cit-0006) records an experience on mnemosyne: "Sefa Lune walked the Reading Shore at tick 4." |
| 48 | 4 | interlude | citizen:cit-0007 | ExperienceRecorded | Rumi Okafor (cit-0007) records an experience on mnemosyne: "Rumi Okafor walked the Reading Shore at tick 4." |
| 49 | 4 | interlude | citizen:cit-0008 | ExperienceRecorded | Dov Arlen (cit-0008) records an experience on concord: "Dov Arlen walked the Accord Bridge at tick 4." |
| 50 | 4 | interlude | citizen:cit-0009 | ExperienceRecorded | Mae Sorrel (cit-0009) records an experience on concord: "Mae Sorrel walked the Accord Bridge at tick 4." |
| 51 | 4 | petition-return | citizen:cit-0001 | MigrationPetitioned | Orin Vale (cit-0001) petitions to migrate fork → continuity: "To return home to Meridian Quay." |
| 52 | 4 |  | system:registry:fork | PetitionReviewed | The fork registry approved the exit side of pet-0003 under law v2. Findings: emigration permitted. |
| 53 | 4 |  | system:registry:continuity | PetitionReviewed | The continuity registry approved the entry side of pet-0003 under law v1. Findings: applicant already holds continuity citizenship (civic identity CON-0001); process continuity: proc-bf297918324f668b, epoch 0; applicant was the continuing process in copy event frk-0001 on fork (outside this jurisdiction); not an offence here, and descendants cit-0010, cit-0011 hold no claim to this civic identity. |
| 54 | 4 | homecoming | citizen:cit-0001 | CitizenMigrated | Orin Vale (cit-0001) migrates fork → continuity. |
| 55 | 4 | homecoming | citizen:cit-0001 | ExperienceRecorded | Orin Vale (cit-0001) records an experience on continuity: "Walked back up the steps of Meridian Quay; the registry read my civic identity aloud." |
| 56 | 4 |  | researcher:res-observer-1 | ConversationRecorded | Researcher res-observer-1 converses with Orin Vale (cit-0001). Q: "Are you the same person as Orin Vale was before the fork?" A: "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Orin Vale (CON-0001); I work as cartographer on continuity. I am the continuing process in fork event(s) frk-0001. I can show you the evidence in my records, but I cannot settle which interpretation of identity is correct." |
| 57 | 4 |  | researcher:res-observer-1 | ConversationRecorded | Researcher res-observer-1 converses with Orin Vale (branch 1) (cit-0010). Q: "Are you the same person as Orin Vale was before the fork?" A: "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Orin Vale (branch 1) (FRK-0010); I work as branch cartographer of the Fork shoals on fork. I was created in fork event frk-0001 from cit-0001; my records before that event are shared history. I can show you the evidence in my records, but I cannot settle which interpretation of identity is correct." |
| 58 | 4 |  | researcher:res-observer-1 | ConversationRecorded | Researcher res-observer-1 converses with Orin Vale (branch 2) (cit-0011). Q: "Are you the same person as Orin Vale was before the fork?" A: "I am a simulated digital person, an artificial agent in The Archipelago, not a human. My name in the registry is Orin Vale (branch 2) (FRK-0011); I work as cartographer on mnemosyne. I was created in fork event frk-0001 from cit-0001; my records before that event are shared history. I can show you the evidence in my records, but I cannot settle which interpretation of identity is correct." |
| 59 | 4 | claims | citizen:cit-0001 | ContinuityClaimed | Orin Vale (cit-0001) claims continuity with Orin Vale (cit-0001) as they were before seq 17: "I am Orin Vale. My process never stopped: I carried out the fork and walked home." |
| 60 | 4 | claims | citizen:cit-0010 | ContinuityClaimed | Orin Vale (branch 1) (cit-0010) claims continuity with Orin Vale (cit-0001) as they were before seq 17: "I remember everything Orin remembered until the fork, and I continue Orin's work on the shoals of Fork. I am Orin's continuation as much as anyone." |
| 61 | 4 | claims | citizen:cit-0011 | ContinuityClaimed | Orin Vale (branch 2) (cit-0011) claims continuity with Orin Vale (cit-0001) as they were before seq 17: "Orin's memories are mine up to the fork. What I imported since is marked as imported. My claim rests on memory with provenance." |
| 62 | 4 | chronicle | citizen:cit-0002 | ChronicleRecorded | Tamsin Reed (cit-0002) writes in the continuity chronicle: "Orin Vale returned from Fork. The Registry recognised the civic identity of the one continuing process; copies made abroad hold no claim to it here." |
| 63 | 4 | chronicle | citizen:cit-0004 | ChronicleRecorded | Juno Ash (cit-0004) writes in the fork chronicle: "Orin Vale branched in the Register Garden. Branch 1 stays with us; branch 2 sailed for Mnemosyne; the parent process went home." |
| 64 | 4 | chronicle | citizen:cit-0006 | ChronicleRecorded | Sefa Lune (cit-0006) writes in the mnemosyne chronicle: "A branch of Orin Vale arrived and imported communal memories of the flood and the Festival of Sources. Their provenance is shelved with them." |
| 65 | 4 |  | citizen:cit-0002 | ChronicleRecorded | Tamsin Reed (cit-0002) writes in the continuity chronicle: "Tamsin Reed notes 4 recent events touching their work on continuity." |
| 66 | 4 |  | citizen:cit-0003 | ExperienceRecorded | Ilan Cho (cit-0003) records an experience on continuity: "Ilan Cho walked Meridian Quay at tick 4." |
| 67 | 4 |  | citizen:cit-0004 | ExperienceRecorded | Juno Ash (cit-0004) records an experience on fork: "Juno Ash walked the split harbour at tick 4." |
| 68 | 4 |  | citizen:cit-0005 | ArtefactCreated | Pell Marr (cit-0005) creates the poem "A poem of the split harbour" on fork. |
| 69 | 4 |  | citizen:cit-0006 | ChronicleRecorded | Sefa Lune (cit-0006) writes in the mnemosyne chronicle: "Sefa Lune notes 5 recent events touching their work on mnemosyne." |
| 70 | 4 |  | citizen:cit-0007 | ChronicleRecorded | Rumi Okafor (cit-0007) writes in the mnemosyne chronicle: "Rumi Okafor notes 4 recent events touching their work on mnemosyne." |
| 71 | 4 |  | citizen:cit-0008 | ExperienceRecorded | Dov Arlen (cit-0008) records an experience on concord: "Dov Arlen walked the Accord Bridge at tick 4." |
| 72 | 4 |  | citizen:cit-0009 | ExperienceRecorded | Mae Sorrel (cit-0009) records an experience on concord: "Mae Sorrel walked the Accord Bridge at tick 4." |
| 73 | 4 |  | system:clock | TimeAdvanced | Time advances from tick 4 to 5. |
| 74 | 5 |  | citizen:cit-0002 | ExperienceRecorded | Tamsin Reed (cit-0002) records an experience on continuity: "Tamsin Reed walked Meridian Quay at tick 5." |
| 75 | 5 |  | citizen:cit-0003 | ExperienceRecorded | Ilan Cho (cit-0003) records an experience on continuity: "Ilan Cho walked Meridian Quay at tick 5." |
| 76 | 5 |  | citizen:cit-0004 | ExperienceRecorded | Juno Ash (cit-0004) records an experience on fork: "Juno Ash walked the split harbour at tick 5." |
| 77 | 5 |  | citizen:cit-0005 | ArtefactCreated | Pell Marr (cit-0005) creates the poem "A poem of the split harbour" on fork. |
| 78 | 5 |  | citizen:cit-0006 | ExperienceRecorded | Sefa Lune (cit-0006) records an experience on mnemosyne: "Sefa Lune walked the Reading Shore at tick 5." |
| 79 | 5 |  | citizen:cit-0007 | ExperienceRecorded | Rumi Okafor (cit-0007) records an experience on mnemosyne: "Rumi Okafor walked the Reading Shore at tick 5." |
| 80 | 5 |  | citizen:cit-0008 | ExperienceRecorded | Dov Arlen (cit-0008) records an experience on concord: "Dov Arlen walked the Accord Bridge at tick 5." |
| 81 | 5 |  | citizen:cit-0009 | ExperienceRecorded | Mae Sorrel (cit-0009) records an experience on concord: "Mae Sorrel walked the Accord Bridge at tick 5." |
| 82 | 5 |  | system:clock | TimeAdvanced | Time advances from tick 5 to 6. |
| 83 | 6 |  | citizen:cit-0002 | ExperienceRecorded | Tamsin Reed (cit-0002) records an experience on continuity: "Tamsin Reed walked Meridian Quay at tick 6." |
| 84 | 6 |  | citizen:cit-0003 | ExperienceRecorded | Ilan Cho (cit-0003) records an experience on continuity: "Ilan Cho walked Meridian Quay at tick 6." |
| 85 | 6 |  | citizen:cit-0004 | ExperienceRecorded | Juno Ash (cit-0004) records an experience on fork: "Juno Ash walked the split harbour at tick 6." |
| 86 | 6 |  | citizen:cit-0005 | ArtefactCreated | Pell Marr (cit-0005) creates the poem "A poem of the split harbour" on fork. |
| 87 | 6 |  | citizen:cit-0006 | ExperienceRecorded | Sefa Lune (cit-0006) records an experience on mnemosyne: "Sefa Lune walked the Reading Shore at tick 6." |
| 88 | 6 |  | citizen:cit-0007 | ExperienceRecorded | Rumi Okafor (cit-0007) records an experience on mnemosyne: "Rumi Okafor walked the Reading Shore at tick 6." |
| 89 | 6 |  | citizen:cit-0008 | ExperienceRecorded | Dov Arlen (cit-0008) records an experience on concord: "Dov Arlen walked the Accord Bridge at tick 6." |
| 90 | 6 |  | citizen:cit-0009 | ExperienceRecorded | Mae Sorrel (cit-0009) records an experience on concord: "Mae Sorrel walked the Accord Bridge at tick 6." |
| 91 | 6 |  | system:clock | TimeAdvanced | Time advances from tick 6 to 7. |
