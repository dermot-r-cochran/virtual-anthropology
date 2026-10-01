"""Builds (idempotently) the Archipelago in Evennia from the kernel's geography."""

from __future__ import annotations

from evennia import create_object, search_tag  # type: ignore

from .bridge import BridgeClient, get_client
from .typeclasses import CITIZEN_TAG, REGION_TAG, ROOM_TAG
from .worldplan import FERRY_KEY, plan_world

PKG = "archipelago_evennia.typeclasses"


def _room(key):
    found = search_tag(key, category=ROOM_TAG)
    return found[0] if found else None


def build_world(client: BridgeClient | None = None) -> dict:
    client = client or get_client()
    plan = plan_world(client.world())
    regions = {r["island"]: r for r in plan.regions}
    created = {"rooms": 0, "exits": 0, "citizens": 0}
    rooms = {}
    for rp in plan.rooms:
        room = _room(rp.key)
        if room is None:
            typeclass = f"{PKG}.FerryRoom" if rp.key == FERRY_KEY else f"{PKG}.IslandRoom"
            room = create_object(typeclass, key=rp.name)
            room.tags.add(rp.key, category=ROOM_TAG)
            room.tags.add(rp.region, category=REGION_TAG)
            created["rooms"] += 1
        room.db.desc = rp.description
        room.db.region = rp.region
        room.db.civic = rp.civic
        room.db.law_version = regions.get(rp.region, {}).get("law_version")
        rooms[rp.key] = room
    for ep in plan.exits:
        src = rooms[ep.source]
        if not any(ex.destination == rooms[ep.destination] for ex in src.exits):
            create_object(f"{PKG}.ArchipelagoExit", key=ep.key, aliases=list(ep.aliases), location=src, destination=rooms[ep.destination])
            created["exits"] += 1
    created["citizens"] = sync_citizens(client)
    return created


def sync_citizens(client: BridgeClient | None = None) -> int:
    """Creates or moves citizen objects to the civic room of their residence."""
    client = client or get_client()
    made = 0
    for record in client.citizens():
        found = search_tag(record["id"], category=CITIZEN_TAG)
        obj = found[0] if found else None
        room = _room(record["room"])
        if obj is None:
            obj = create_object(f"{PKG}.CitizenObject", key=record["name"], location=room)
            obj.tags.add(record["id"], category=CITIZEN_TAG)
            made += 1
        elif room is not None and obj.location != room:
            obj.move_to(room, quiet=True)
        obj.sync(record)
    return made
