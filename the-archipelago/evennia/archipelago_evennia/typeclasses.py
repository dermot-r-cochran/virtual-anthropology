"""Evennia typeclasses for the Archipelago world layer (require Evennia).

Rooms and regions are presentation: island law lives in the kernel. Citizen
objects are puppets of kernel records; their state is refreshed from the
bridge and never written back except through kernel commands.
"""

from __future__ import annotations

from evennia import DefaultExit, DefaultObject, DefaultRoom  # type: ignore

from .formatting import citizen_description

ROOM_TAG = "archipelago-room"
REGION_TAG = "archipelago-region"
CITIZEN_TAG = "archipelago-citizen"


class IslandRoom(DefaultRoom):
    """A room on an island. ``db.region`` names the jurisdiction (island id)."""

    def return_appearance(self, looker, **kwargs):
        text = super().return_appearance(looker, **kwargs)
        region = self.db.region
        if region and region != "sea":
            law = self.db.law_version
            text += f"\n|xJurisdiction: {region}{f' (law v{law})' if law else ''}. Island law, not this room, governs identity here.|n"
        return text


class FerryRoom(IslandRoom):
    """The inter-island ferry: travel without migration."""


class ArchipelagoExit(DefaultExit):
    pass


class CitizenObject(DefaultObject):
    """In-world representation of a kernel citizen record (``db.citizen_id``)."""

    def at_object_creation(self):
        self.locks.add("get:false();puppet:false()")

    def sync(self, record: dict) -> None:
        self.db.citizen_id = record["id"]
        self.db.record = record
        self.key = record["name"]

    def return_appearance(self, looker, **kwargs):
        record = self.db.record or {}
        if not record:
            return super().return_appearance(looker, **kwargs)
        return citizen_description(record)
