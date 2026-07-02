import test from "node:test";
import assert from "node:assert/strict";
import { endpoints, findEndpoint } from "../src/endpoints.js";

test("registry includes every documented API group", () => {
  const topLevel = new Set(endpoints.map((endpoint) => endpoint.pattern[0]));
  for (const group of [
    "email",
    "bulk",
    "bounces",
    "templates",
    "server",
    "servers",
    "streams",
    "messages",
    "domains",
    "signatures",
    "stats",
    "inbound-rules",
    "webhooks",
    "suppressions",
    "data-removals",
  ]) {
    assert.equal(topLevel.has(group), true, `missing ${group}`);
  }
});

test("findEndpoint extracts path params", () => {
  const match = findEndpoint(["webhooks", "update", "123"]);
  assert.equal(match?.endpoint.path, "/webhooks/:webhookId");
  assert.deepEqual(match?.params, { webhookId: "123" });
});

test("mutating endpoints are marked", () => {
  assert.equal(findEndpoint(["server", "update"])?.endpoint.mutation, true);
  assert.equal(findEndpoint(["servers", "list"])?.endpoint.mutation, undefined);
});

test("suppressions support positional message stream", () => {
  const match = findEndpoint(["suppressions", "dump", "outbound"]);
  assert.equal(match?.endpoint.path, "/message-streams/:streamId/suppressions/dump");
  assert.deepEqual(match?.params, { streamId: "outbound" });
});
