"""Global script that announces new kernel events in the rooms of the regions involved."""

from __future__ import annotations

from evennia import DefaultScript, search_tag  # type: ignore

from .bridge import BridgeError, get_client
from .build import sync_citizens
from .formatting import event_line, events_for_region
from .typeclasses import REGION_TAG


class EventPoller(DefaultScript):
    def at_script_creation(self):
        self.key = "archipelago_event_poller"
        self.desc = "Relays kernel events into Evennia rooms"
        self.interval = 5
        self.persistent = True
        self.db.last_seq = -1

    def at_repeat(self):
        try:
            client = get_client()
            events = client.events(self.db.last_seq if self.db.last_seq is not None else -1)
        except BridgeError as exc:
            self.db.last_error = str(exc)
            return
        if not events:
            return
        self.db.last_seq = events[-1]["seq"]
        for island in {i for e in events for i in e.get("islands", [])}:
            lines = [event_line(e) for e in events_for_region(events, island)]
            for room in search_tag(island, category=REGION_TAG):
                room.msg_contents("\n".join(lines))
        sync_citizens(client)
