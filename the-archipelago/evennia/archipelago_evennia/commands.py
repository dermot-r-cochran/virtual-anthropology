"""Researcher commands (require Evennia).

Researchers may observe, converse, inspect provenance, pause, step the
simulation, apply bounded interventions and export histories. Every write is
sent to the kernel as a command and may be refused by policy.
"""

from __future__ import annotations

import json

from evennia import CmdSet, Command  # type: ignore

from .bridge import BridgeError, get_client
from .formatting import conversation_lines, event_line, outcome_line, parse_ask, resolve_citizen

LOCK = "cmd:perm(Researcher) or perm(Builder)"


class ResearcherCommand(Command):
    locks = LOCK
    help_category = "Archipelago research"

    def researcher(self):
        account = getattr(self, "account", None)
        return account.db.researcher_id if account and account.db.researcher_id else None

    def func(self):
        try:
            self.run(get_client())
        except (BridgeError, LookupError, ValueError) as exc:
            self.caller.msg(f"|r{exc}|n")

    def run(self, client):  # pragma: no cover - overridden
        raise NotImplementedError


class CmdCitizens(ResearcherCommand):
    """List citizens. Usage: citizens"""

    key = "citizens"

    def run(self, client):
        rows = [f"{c['id']}  {c['name']:<24} {c['residence']:<10} {c['lifecycle']}" for c in client.citizens()]
        self.caller.msg("Simulated digital persons (artificial agents):\n" + "\n".join(rows))


class CmdAsk(ResearcherCommand):
    """Converse with a citizen. Usage: ask <citizen> = <utterance>"""

    key = "ask"

    def run(self, client):
        who, text = parse_ask(self.args)
        c = resolve_citizen(who, client.citizens())
        self.caller.msg(conversation_lines(c["name"], client.converse(c["id"], text, self.researcher())))


class CmdInspect(ResearcherCommand):
    """Inspect a citizen's record, mind provenance, lineage and memories. Usage: inspect <citizen>"""

    key = "inspect"

    def run(self, client):
        c = resolve_citizen(self.args, client.citizens())
        data = client.inspect(c["id"], self.researcher())
        mem = "\n".join(f"  {m['id']} [{m['status']}] experienced by {m['experiencedBy']} — {' → '.join(p['action'] for p in m['provenance'])}" for m in data["memories"])
        self.caller.msg(
            f"{c['name']} ({c['id']})\nmind provenance: {json.dumps(data['mindProvenance'])}\nancestors: {', '.join(data['ancestors']) or '—'}\nmemories:\n{mem}"
        )


class CmdProvenance(ResearcherCommand):
    """Show a memory record's provenance chain. Usage: provenance <memory-id>"""

    key = "provenance"

    def run(self, client):
        m = client.provenance(self.args.strip(), self.researcher())
        chain = "\n".join(f"  {p['action']} by {p.get('by') or '—'} at seq {p['atSeq']} ({p['island']})" for p in m["provenance"])
        self.caller.msg(f"{m['id']} [{m['status']}, {m['integrity']}] experienced by {m['experiencedBy']}\n{chain}")


class CmdEvents(ResearcherCommand):
    """Show recent kernel events. Usage: events [since-seq]"""

    key = "events"

    def run(self, client):
        since = int(self.args.strip()) if self.args.strip() else -1
        events = client.events(since)[-20:]
        self.caller.msg("\n".join(event_line(e) for e in events) or "No events.")


class CmdStep(ResearcherCommand):
    """Run agent-based rounds. Usage: step [rounds]"""

    key = "step"

    def run(self, client):
        n = int(self.args.strip() or 1)
        r = client.step(n)
        self.caller.msg(f"Ran {len(r['rounds'])} round(s); now at seq {r['seq']}.")


class CmdPause(ResearcherCommand):
    """Pause the simulation. Usage: pause <reason>"""

    key = "pause"

    def run(self, client):
        self.caller.msg(outcome_line("pause", client.pause(self.args.strip() or "researcher pause", self.researcher())))


class CmdResume(ResearcherCommand):
    """Resume the simulation. Usage: resume <reason>"""

    key = "resume"

    def run(self, client):
        self.caller.msg(outcome_line("resume", client.resume(self.args.strip() or "researcher resume", self.researcher())))


class CmdIntervene(ResearcherCommand):
    """Apply a bounded intervention. Usage: intervene <json-spec> = <justification>"""

    key = "intervene"

    def run(self, client):
        spec, _, why = self.args.partition("=")
        self.caller.msg(outcome_line("intervene", client.intervene(json.loads(spec), why.strip(), self.researcher())))


class CmdExportHistory(ResearcherCommand):
    """Show the event store's head hash and size. Usage: exporthistory"""

    key = "exporthistory"

    def run(self, client):
        r = client.export()
        self.caller.msg(f"{r['eventCount']} events; head {r['headHash']}. Use the simulation CLI to publish the full dataset.")


class ResearcherCmdSet(CmdSet):
    key = "ArchipelagoResearcher"

    def at_cmdset_creation(self):
        for cmd in (CmdCitizens, CmdAsk, CmdInspect, CmdProvenance, CmdEvents, CmdStep, CmdPause, CmdResume, CmdIntervene, CmdExportHistory):
            self.add(cmd())
