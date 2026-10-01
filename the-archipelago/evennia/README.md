# Evennia world layer

`the-archipelago/evennia/` renders the kernel in [Evennia](https://www.evennia.com/) (tested with 6.1.0).

- `archipelago_evennia/bridge.py`: a JSON-lines client that starts `npx tsx src/bridge/server.ts <experiment.yaml>`.
- `worldplan.py`: turns kernel geography into rooms, exits and the inter-island ferry. Its logic is pure.
- `typeclasses.py`: `IslandRoom`, `FerryRoom`, `ArchipelagoExit` and `CitizenObject`. Citizens always disclose their artificial nature.
- `build.py`: `build_world()` is idempotent and also syncs citizens.
- `scripts.py`: `EventPoller` relays kernel events to the rooms of the regions involved.
- `commands.py`: `ResearcherCmdSet`, which provides `citizens`, `ask <citizen> = <text>`, `inspect`, `provenance`, `events`, `step`, `pause`, `resume`, `intervene` and `exporthistory`.

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
