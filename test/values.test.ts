import test from "node:test";
import assert from "node:assert/strict";
import { applyAssignments, unknownFlagsToBody, unknownFlagsToQuery } from "../src/values.js";

test("unknown body flags become PascalCase Postmark fields", () => {
  assert.deepEqual(
    unknownFlagsToBody([
      { name: "name", value: "Production" },
      { name: "inbound-hook-url", value: "https://example.com/inbound" },
      { name: "track-opens", value: "true" },
    ]),
    {
      Name: "Production",
      InboundHookUrl: "https://example.com/inbound",
      TrackOpens: true,
    },
  );
});

test("unknown query flags become camelCase query parameters", () => {
  assert.deepEqual(
    unknownFlagsToQuery([
      { name: "from-date", value: "2026-01-01" },
      { name: "count", value: "50" },
    ]),
    {
      fromDate: "2026-01-01",
      count: "50",
    },
  );
});

test("applyAssignments supports dotted paths and typed values", () => {
  const body: Record<string, unknown> = {};
  applyAssignments(body, ["Triggers.Open.Enabled=true", "Count=3"]);
  assert.deepEqual(body, {
    Triggers: {
      Open: {
        Enabled: true,
      },
    },
    Count: 3,
  });
});
