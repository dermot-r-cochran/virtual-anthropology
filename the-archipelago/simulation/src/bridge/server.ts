import { createInterface } from "node:readline";
import { loadManifest } from "../research/manifest.js";
import { runFirstFork } from "../scenarios/the-first-fork/run.js";
import { createBridge } from "./protocol.js";

/**
 * Stdio bridge: `tsx src/bridge/server.ts <experiment.yaml>`.
 * Runs the experiment's scenario, then serves JSON-lines requests on stdin.
 * Used by the Evennia world layer (the-archipelago/evennia).
 */
const path = process.argv[2] ?? new URL("../../../experiments/the-first-fork/experiment.yaml", import.meta.url).pathname;
const manifest = loadManifest(path);
if (manifest.scenario !== "the-first-fork") throw new Error(`bridge supports the-first-fork, not ${manifest.scenario}`);
const run = await runFirstFork({ seed: manifest.seed, abmRounds: manifest.parameters.abmRounds, researchBounds: manifest.researchBounds, researchers: manifest.researchers.map((r) => r.id) });
const bridge = createBridge(run, manifest.seed);

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
let queue = Promise.resolve();
rl.on("line", (line) => {
  if (line.trim() === "") return;
  queue = queue.then(async () => {
    process.stdout.write(JSON.stringify(await bridge.handle(line)) + "\n");
  });
});
