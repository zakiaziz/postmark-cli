import test from "node:test";
import assert from "node:assert/strict";
import { applyAssignments } from "../src/values.js";

test("applyAssignments supports dotted paths and typed values", () => {
  const body: Record<string, unknown> = {};
  applyAssignments(body, ["Triggers.Open.Enabled=true", "Count=3"]);
  assert.deepEqual(body, {
    Triggers: { Open: { Enabled: true } },
    Count: 3,
  });
});

test("applyAssignments rejects malformed fields", () => {
  assert.throws(() => applyAssignments({}, ["missing-value"]), /Use Key=value/);
});
