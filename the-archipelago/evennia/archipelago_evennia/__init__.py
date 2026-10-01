"""Evennia world layer for The Archipelago.

Evennia renders the civilization as rooms, regions, citizens and events, and
gives human researchers an in-world console. The canonical world lives in the
TypeScript civilization kernel; this package talks to it over the JSON-lines
bridge (``the-archipelago/simulation/src/bridge``). Evennia never mutates the
world directly: every write is a kernel command validated by island law.
"""

PROTOCOL_VERSION = 1
