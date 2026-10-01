"""Pure world-building plan: kernel geography -> Evennia rooms, regions and exits."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

FERRY_KEY = "ferry-deck"


@dataclass(frozen=True)
class RoomPlan:
    key: str
    name: str
    description: str
    region: str
    civic: bool = False
    harbour: bool = False


@dataclass(frozen=True)
class ExitPlan:
    key: str
    source: str
    destination: str
    aliases: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class WorldPlan:
    regions: tuple[dict[str, Any], ...]
    rooms: tuple[RoomPlan, ...]
    exits: tuple[ExitPlan, ...]


def plan_world(world: dict[str, Any]) -> WorldPlan:
    """Rooms within an island are connected in sequence; harbours connect to a shared ferry."""
    rooms: list[RoomPlan] = [RoomPlan(FERRY_KEY, "the Inter-Island Ferry", "A slow ferry that calls at every harbour. Crossing water does not change your citizenship; only a petition does.", "sea")]
    exits: list[ExitPlan] = []
    regions = []
    for region in world["regions"]:
        island = region["island"]
        regions.append({"island": island, "name": region["name"], "description": region["description"], "motto": region.get("motto", ""), "law_version": region.get("lawVersion")})
        specs = region["rooms"]
        for spec in specs:
            rooms.append(RoomPlan(spec["key"], spec["name"], spec["description"], island, bool(spec.get("civic")), spec["key"] == region["harbour"]))
        for a, b in zip(specs, specs[1:]):
            exits.append(ExitPlan(f"to {b['name']}", a["key"], b["key"]))
            exits.append(ExitPlan(f"to {a['name']}", b["key"], a["key"]))
        exits.append(ExitPlan("board ferry", region["harbour"], FERRY_KEY, ("ferry",)))
        exits.append(ExitPlan(f"disembark at {region['name']}", FERRY_KEY, region["harbour"], (island,)))
    keys = [r.key for r in rooms]
    if len(keys) != len(set(keys)):
        raise ValueError("room keys must be unique across the Archipelago")
    return WorldPlan(tuple(regions), tuple(rooms), tuple(exits))
