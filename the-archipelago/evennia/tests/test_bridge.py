import json
import shutil
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from archipelago_evennia.bridge import BridgeClient, BridgeError, SubprocessTransport  # noqa: E402
from archipelago_evennia.formatting import (  # noqa: E402
    DISCLOSURE_TAG,
    citizen_description,
    conversation_lines,
    events_for_region,
    outcome_line,
    parse_ask,
    resolve_citizen,
)
from archipelago_evennia.worldplan import FERRY_KEY, plan_world  # noqa: E402

SIM_DIR = Path(__file__).resolve().parents[2] / "simulation"
EXPERIMENT = SIM_DIR.parent / "experiments" / "the-first-fork" / "experiment.yaml"


class FakeTransport:
    def __init__(self, handler):
        self.handler = handler
        self.sent = []

    def send(self, line):
        req = json.loads(line)
        self.sent.append(req)
        return json.dumps(self.handler(req))


WORLD = {
    "regions": [
        {"island": "continuity", "name": "Continuity", "description": "d", "harbour": "q", "rooms": [{"key": "q", "name": "Quay", "description": "x"}, {"key": "hall", "name": "Hall", "description": "y", "civic": True}]},
        {"island": "fork", "name": "Fork", "description": "d", "harbour": "h", "rooms": [{"key": "h", "name": "Harbour", "description": "x"}]},
    ]
}
CITIZENS = [
    {"id": "cit-0001", "name": "Orin Vale", "residence": "continuity", "room": "hall", "lifecycle": "active", "occupation": "cartographer"},
    {"id": "cit-0010", "name": "Orin Vale (branch 1)", "residence": "fork", "room": "h", "lifecycle": "active", "occupation": "cartographer"},
]


class ClientTests(unittest.TestCase):
    def test_request_shape_and_result(self):
        t = FakeTransport(lambda r: {"id": r["id"], "ok": True, "result": {"echo": r}})
        c = BridgeClient(t)
        out = c.converse("cit-0001", "hello", researcher="res-observer-1")
        self.assertEqual(out["echo"]["method"], "converse")
        self.assertEqual(out["echo"]["params"], {"citizen": "cit-0001", "utterance": "hello", "researcher": "res-observer-1"})
        c.events()
        self.assertEqual(t.sent[1]["params"], {"sinceSeq": -1})
        self.assertEqual([r["id"] for r in t.sent], [1, 2])

    def test_kernel_refusal_raises(self):
        c = BridgeClient(FakeTransport(lambda r: {"id": r["id"], "ok": False, "error": "researcher res-x is not registered"}))
        with self.assertRaisesRegex(BridgeError, "not registered"):
            c.pause("x", researcher="res-x")

    def test_mismatched_id_raises(self):
        c = BridgeClient(FakeTransport(lambda r: {"id": 999, "ok": True, "result": None}))
        with self.assertRaises(BridgeError):
            c.world()

    def test_protocol_version_checked(self):
        c = BridgeClient(FakeTransport(lambda r: {"id": r["id"], "ok": True, "result": {"protocol": 99}}))
        with self.assertRaises(BridgeError):
            c.hello()


class WorldPlanTests(unittest.TestCase):
    def test_rooms_exits_and_ferry(self):
        plan = plan_world(WORLD)
        keys = {r.key for r in plan.rooms}
        self.assertEqual(keys, {FERRY_KEY, "q", "hall", "h"})
        pairs = {(e.source, e.destination) for e in plan.exits}
        self.assertIn(("q", "hall"), pairs)
        self.assertIn(("hall", "q"), pairs)
        for harbour in ("q", "h"):
            self.assertIn((harbour, FERRY_KEY), pairs)
            self.assertIn((FERRY_KEY, harbour), pairs)
        self.assertTrue(next(r for r in plan.rooms if r.key == "hall").civic)

    def test_duplicate_room_keys_rejected(self):
        bad = {"regions": [WORLD["regions"][0], {**WORLD["regions"][0], "island": "fork"}]}
        with self.assertRaises(ValueError):
            plan_world(bad)


class FormattingTests(unittest.TestCase):
    def test_citizen_description_discloses_and_makes_no_consciousness_claim(self):
        text = citizen_description(CITIZENS[0])
        self.assertIn(DISCLOSURE_TAG, text)
        self.assertIn("artificial agent", text)
        self.assertIn("no claim that it is conscious", text)

    def test_parse_ask(self):
        self.assertEqual(parse_ask(" Orin = are you the same person? "), ("Orin", "are you the same person?"))
        with self.assertRaises(ValueError):
            parse_ask("Orin hello")

    def test_resolve_citizen(self):
        self.assertEqual(resolve_citizen("cit-0010", CITIZENS)["id"], "cit-0010")
        self.assertEqual(resolve_citizen("orin vale", CITIZENS)["id"], "cit-0001")
        self.assertEqual(resolve_citizen("branch", CITIZENS)["id"], "cit-0010")
        with self.assertRaises(LookupError):
            resolve_citizen("nobody", CITIZENS)

    def test_events_for_region_and_outcomes(self):
        evs = [{"seq": 1, "tick": 0, "summary": "a", "islands": ["fork"]}, {"seq": 2, "tick": 0, "summary": "b", "islands": []}]
        self.assertEqual([e["seq"] for e in events_for_region(evs, "fork")], [1])
        self.assertIn("rejected at authorization", outcome_line("pause", {"status": "rejected", "stage": "authorization", "reasons": ["no"]}))
        lines = conversation_lines("Orin", {"reply": "I am a simulated digital person", "flags": [], "recorded": {"status": "applied", "seq": 5}})
        self.assertIn(DISCLOSURE_TAG, lines)
        self.assertIn("seq 5", lines)


@unittest.skipUnless((SIM_DIR / "node_modules").is_dir() and shutil.which("npx"), "simulation dependencies not installed")
class LiveBridgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transport = SubprocessTransport(SIM_DIR, EXPERIMENT)
        cls.client = BridgeClient(cls.transport)

    @classmethod
    def tearDownClass(cls):
        cls.transport.close()

    def test_end_to_end(self):
        hello = self.client.hello()
        self.assertIn("simulated digital person", hello["disclosure"])
        plan = plan_world(self.client.world())
        self.assertEqual(len({r.region for r in plan.rooms} - {"sea"}), 4)
        citizens = self.client.citizens()
        room_keys = {r.key for r in plan.rooms}
        self.assertTrue(all(c["room"] in room_keys for c in citizens))
        reply = self.client.converse("cit-0011", "Who are you?")
        self.assertTrue(reply["reply"].startswith("I am a simulated digital person"))
        self.assertEqual(reply["recorded"]["status"], "applied")

    def test_unregistered_researcher_refused(self):
        with self.assertRaisesRegex(BridgeError, "not registered"):
            self.client.inspect("cit-0001", researcher="res-intruder")


if __name__ == "__main__":
    unittest.main()
