"""Text rendering for the Evennia layer. Pure functions, no Evennia dependency."""

from __future__ import annotations

from typing import Any, Iterable

DISCLOSURE_TAG = "|y[simulated digital person]|n"


def citizen_description(c: dict[str, Any]) -> str:
    """What a researcher sees on ``look <citizen>``. Always discloses artificial nature."""
    return (
        f"{c['name']} ({c['id']}) {DISCLOSURE_TAG}\n"
        f"Occupation: {c['occupation']}. Residence: {c['residence']}. Lifecycle state: {c['lifecycle']}.\n"
        "This is a simulated digital person, an artificial agent. The simulation makes no claim that it is conscious."
    )


def event_line(e: dict[str, Any]) -> str:
    return f"|w[seq {e['seq']} · tick {e['tick']}]|n {e['summary']}"


def events_for_region(events: Iterable[dict[str, Any]], island: str) -> list[dict[str, Any]]:
    return [e for e in events if island in e.get("islands", [])]


def conversation_lines(citizen_name: str, reply: dict[str, Any]) -> str:
    lines = [f"{citizen_name} {DISCLOSURE_TAG} says: {reply['reply']}"]
    if reply.get("flags"):
        lines.append(f"|r(guard flags: {', '.join(reply['flags'])})|n")
    rec = reply.get("recorded", {})
    if rec.get("status") == "applied":
        lines.append(f"|x(recorded at seq {rec.get('seq')})|n")
    else:
        lines.append(f"|r(not recorded: {'; '.join(rec.get('reasons', []))})|n")
    return "\n".join(lines)


def outcome_line(action: str, result: dict[str, Any]) -> str:
    if result.get("status") == "applied":
        return f"{action}: applied (seq {result.get('seq')})."
    return f"{action}: rejected at {result.get('stage')} — {'; '.join(result.get('reasons', []))}"


def parse_ask(args: str) -> tuple[str, str]:
    """``ask <citizen> = <utterance>`` -> (citizen, utterance)."""
    if "=" not in args:
        raise ValueError("usage: ask <citizen-id or name> = <what you say>")
    who, _, text = args.partition("=")
    who, text = who.strip(), text.strip()
    if not who or not text:
        raise ValueError("usage: ask <citizen-id or name> = <what you say>")
    return who, text


def resolve_citizen(query: str, citizens: Iterable[dict[str, Any]]) -> dict[str, Any]:
    q = query.strip().lower()
    cs = list(citizens)
    exact = [c for c in cs if c["id"].lower() == q or c["name"].lower() == q]
    if len(exact) == 1:
        return exact[0]
    partial = [c for c in cs if q in c["name"].lower()]
    if len(partial) == 1:
        return partial[0]
    if not exact and not partial:
        raise LookupError(f"no citizen matches '{query}'")
    raise LookupError(f"'{query}' is ambiguous: {', '.join(c['id'] for c in (exact or partial))}")
