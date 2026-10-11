import test from "node:test";
import assert from "node:assert/strict";
import { getGlobalOptions, parseArgs } from "../src/args.js";

test("parseArgs separates commands, known flags, and endpoint fields", () => {
  const parsed = parseArgs([
    "server",
    "update",
    "--profile",
    "work",
    "--name",
    "Production",
    "--track-opens=true",
    "--set",
    "InboundHookUrl=https://example.com/inbound",
    "--dry-run",
  ]);

  assert.deepEqual(parsed.command, ["server", "update"]);
  assert.equal(getGlobalOptions(parsed).profile, "work");
  assert.equal(getGlobalOptions(parsed).dryRun, true);
  assert.deepEqual(parsed.unknownFlags, [
    { name: "name", value: "Production" },
    { name: "track-opens", value: "true" },
  ]);
});

test("parseArgs supports repeated query flags", () => {
  const parsed = parseArgs(["bounces", "list", "--query", "count=10", "--query", "offset=20"]);
  assert.deepEqual(getGlobalOptions(parsed).query, ["count=10", "offset=20"]);
});
