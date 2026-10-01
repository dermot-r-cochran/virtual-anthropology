"""JSON-lines client for the civilization kernel bridge. No Evennia dependency."""

from __future__ import annotations

import itertools
import json
import os
import subprocess
import threading
from pathlib import Path
from typing import Any, Callable, Optional, Protocol

from . import PROTOCOL_VERSION


class BridgeError(RuntimeError):
    """The kernel refused or could not process a request."""


class Transport(Protocol):
    def send(self, line: str) -> str:
        """Send one request line and return one response line."""


class SubprocessTransport:
    """Runs ``npx tsx src/bridge/server.ts <experiment.yaml>`` and talks over stdio."""

    def __init__(self, simulation_dir: str | os.PathLike[str], experiment: str | os.PathLike[str], command: Optional[list[str]] = None) -> None:
        self._dir = Path(simulation_dir)
        cmd = command or ["npx", "--no-install", "tsx", "src/bridge/server.ts", str(experiment)]
        self._proc = subprocess.Popen(
            cmd, cwd=self._dir, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding="utf-8", bufsize=1,
        )
        self._lock = threading.Lock()

    def send(self, line: str) -> str:
        with self._lock:
            if self._proc.poll() is not None or self._proc.stdin is None or self._proc.stdout is None:
                raise BridgeError("kernel bridge process is not running")
            self._proc.stdin.write(line + "\n")
            self._proc.stdin.flush()
            out = self._proc.stdout.readline()
            if not out:
                err = self._proc.stderr.read() if self._proc.stderr else ""
                raise BridgeError(f"kernel bridge closed: {err.strip()[:500]}")
            return out

    def close(self) -> None:
        if self._proc.poll() is None:
            self._proc.terminate()
            self._proc.wait(timeout=5)


class BridgeClient:
    """Typed wrapper over the bridge protocol."""

    def __init__(self, transport: Transport) -> None:
        self._transport = transport
        self._ids: Callable[[], int] = itertools.count(1).__next__

    def request(self, method: str, params: Optional[dict[str, Any]] = None) -> Any:
        req: dict[str, Any] = {"id": self._ids(), "method": method}
        if params is not None:
            req["params"] = params
        raw = self._transport.send(json.dumps(req, separators=(",", ":")))
        try:
            resp = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise BridgeError(f"invalid response: {raw[:200]!r}") from exc
        if resp.get("id") != req["id"]:
            raise BridgeError(f"response id {resp.get('id')} does not match request {req['id']}")
        if not resp.get("ok"):
            raise BridgeError(resp.get("error", "unknown error"))
        return resp["result"]

    # Protocol methods -----------------------------------------------------
    def hello(self) -> dict[str, Any]:
        result = self.request("hello")
        if result.get("protocol") != PROTOCOL_VERSION:
            raise BridgeError(f"bridge protocol {result.get('protocol')} is not supported (expected {PROTOCOL_VERSION})")
        return result

    def world(self) -> dict[str, Any]:
        return self.request("world")

    def citizens(self) -> list[dict[str, Any]]:
        return self.request("citizens")

    def events(self, since_seq: int = -1) -> list[dict[str, Any]]:
        return self.request("events", {"sinceSeq": since_seq})

    def inspect(self, citizen: str, researcher: Optional[str] = None) -> dict[str, Any]:
        return self.request("inspect", _with_researcher({"citizen": citizen}, researcher))

    def provenance(self, memory: str, researcher: Optional[str] = None) -> dict[str, Any]:
        return self.request("provenance", _with_researcher({"memory": memory}, researcher))

    def converse(self, citizen: str, utterance: str, researcher: Optional[str] = None) -> dict[str, Any]:
        return self.request("converse", _with_researcher({"citizen": citizen, "utterance": utterance}, researcher))

    def step(self, rounds: int = 1) -> dict[str, Any]:
        return self.request("step", {"rounds": rounds})

    def pause(self, reason: str, researcher: Optional[str] = None) -> dict[str, Any]:
        return self.request("pause", _with_researcher({"reason": reason}, researcher))

    def resume(self, reason: str, researcher: Optional[str] = None) -> dict[str, Any]:
        return self.request("resume", _with_researcher({"reason": reason}, researcher))

    def intervene(self, spec: dict[str, Any], justification: str, researcher: Optional[str] = None) -> dict[str, Any]:
        return self.request("intervene", _with_researcher({"spec": spec, "justification": justification}, researcher))

    def export(self) -> dict[str, Any]:
        return self.request("export")


def _with_researcher(params: dict[str, Any], researcher: Optional[str]) -> dict[str, Any]:
    if researcher is not None:
        params["researcher"] = researcher
    return params


_client: Optional[BridgeClient] = None


def get_client() -> BridgeClient:
    """Process-wide client, configured from Evennia settings or environment.

    ``ARCHIPELAGO_SIMULATION_DIR``: path to ``the-archipelago/simulation``.
    ``ARCHIPELAGO_EXPERIMENT``: path to an ``experiment.yaml``.
    """
    global _client
    if _client is None:
        sim_dir: Optional[str] = None
        experiment: Optional[str] = None
        try:  # inside Evennia
            from django.conf import settings  # type: ignore

            sim_dir = getattr(settings, "ARCHIPELAGO_SIMULATION_DIR", None)
            experiment = getattr(settings, "ARCHIPELAGO_EXPERIMENT", None)
        except Exception:  # pragma: no cover - outside Django
            pass
        sim_dir = sim_dir or os.environ.get("ARCHIPELAGO_SIMULATION_DIR")
        if not sim_dir:
            raise BridgeError("set ARCHIPELAGO_SIMULATION_DIR to the-archipelago/simulation")
        experiment = experiment or os.environ.get("ARCHIPELAGO_EXPERIMENT") or str(Path(sim_dir).parent / "experiments" / "the-first-fork" / "experiment.yaml")
        _client = BridgeClient(SubprocessTransport(sim_dir, experiment))
        _client.hello()
    return _client
