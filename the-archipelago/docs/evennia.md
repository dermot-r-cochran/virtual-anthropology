# Evennia world layer

`the-archipelago/evennia/` renders the kernel in [Evennia](https://www.evennia.com/) (tested with 6.1.0).

- `archipelago_evennia/bridge.py`: a JSON-lines client that starts `npx tsx src/bridge/server.ts <experiment.yaml>`. Tested by `tests/test_bridge.py`: `ClientTests.test_request_shape_and_result` and `LiveBridgeTests.test_end_to_end`.
- `worldplan.py`: turns kernel geography into rooms, exits and the inter-island ferry. Its logic is pure. Tested by `WorldPlanTests.test_rooms_exits_and_ferry` and `test_duplicate_room_keys_rejected`.
- `typeclasses.py`: `IslandRoom`, `FerryRoom`, `ArchipelagoExit` and `CitizenObject`. Citizens always disclose their artificial nature. The description they show is tested by `FormattingTests.test_citizen_description_discloses_and_makes_no_consciousness_claim`; the typeclasses themselves need Evennia and have no test yet.
- `build.py`: `build_world()` is idempotent and also syncs citizens. No test yet.
- `scripts.py`: `EventPoller` relays kernel events to the rooms of the regions involved. Its filter is tested by `FormattingTests.test_events_for_region_and_outcomes`; the poller itself has no test yet.
- `commands.py`: `ResearcherCmdSet`, which provides `citizens`, `ask <citizen> = <text>`, `inspect`, `provenance`, `events`, `step`, `pause`, `resume`, `intervene` and `exporthistory`. Their parsing and lookup are tested by `FormattingTests.test_parse_ask` and `test_resolve_citizen`, and the refusal of an unregistered researcher by `LiveBridgeTests.test_unregistered_researcher_refused`; the command set itself has no test yet.

## Setup

Add the following to your game's `server/conf/settings.py`:

```python
import sys
sys.path.insert(0, "/path/to/the-archipelago/evennia")
ARCHIPELAGO_SIMULATION_DIR = "/path/to/the-archipelago/simulation"
ARCHIPELAGO_EXPERIMENT = "/path/to/the-archipelago/experiments/the-first-fork/experiment.yaml"
```

Then, in-game, as a Builder:

```
py from archipelago_evennia.build import build_world; build_world()
py from archipelago_evennia.commands import ResearcherCmdSet; me.cmdset.add(ResearcherCmdSet, persistent=True)
py from evennia import create_script; from archipelago_evennia.scripts import EventPoller; create_script(EventPoller)
py me.account.db.researcher_id = "res-observer-1"
```

To act as a researcher, an account needs the `Researcher` or `Builder` permission, and its `researcher_id` must be registered in the experiment manifest.

Run the tests with `cd evennia && python -m unittest discover -s tests`. They do not need Evennia installed.
