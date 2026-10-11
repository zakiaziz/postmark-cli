import test from "node:test";
import assert from "node:assert/strict";
import { buildRequestPlan, executeRequest, renderDryRun } from "../src/http.js";
import { findEndpoint } from "../src/endpoints.js";

test("buildRequestPlan fills path, query, headers, and body", () => {
  const match = findEndpoint(["webhooks", "update", "123"]);
  assert.ok(match);

  const plan = buildRequestPlan({
    endpoint: match.endpoint,
    params: match.params,
    options: {
      serverToken: "server-token",
      set: [],
      query: ["include=all", "include=active"],
      yes: true,
      dryRun: false,
      json: false,
      help: false,
      version: false,
    },
    context: {
      baseUrl: "https://api.postmarkapp.com",
    },
    query: [],
    body: { Url: "https://example.com/webhook" },
  });

  assert.equal(plan.method, "PUT");
  assert.equal(plan.url, "https://api.postmarkapp.com/webhooks/123?include=all&include=active");
  assert.equal(plan.headers["X-Postmark-Server-Token"], "server-token");
  assert.deepEqual(plan.body, { Url: "https://example.com/webhook" });
});

test("renderDryRun redacts secrets", () => {
  const dryRun = renderDryRun({
    method: "GET",
    url: "https://api.postmarkapp.com/server",
    auth: { kind: "server", token: "secret-token", source: "--server-token" },
    headers: { "X-Postmark-Server-Token": "secret-token" },
  });

  assert.deepEqual(dryRun, {
    method: "GET",
    url: "https://api.postmarkapp.com/server",
    auth: { kind: "server", source: "--server-token" },
    headers: { "X-Postmark-Server-Token": "[redacted]" },
    body: undefined,
  });
});

test("buildRequestPlan uses explicit stream scope over profile defaults", () => {
  const match = findEndpoint(["suppressions", "list"]);
  assert.ok(match);

  const plan = buildRequestPlan({
    endpoint: match.endpoint,
    params: match.params,
    options: {
      serverToken: "server-token",
      messageStream: "outbound",
      set: [],
      query: [],
      yes: false,
      dryRun: true,
      json: false,
      help: false,
      version: false,
    },
    context: {
      baseUrl: "https://api.postmarkapp.com",
    },
    query: [],
  });

  assert.equal(plan.url, "https://api.postmarkapp.com/message-streams/outbound/suppressions/dump");
});


test("executeRequest rejects redirects before credentials can cross origins", async () => {
  const target = Bun.serve({ port: 0, fetch() { return Response.json({ leaked: true }); } });
  const redirect = Bun.serve({
    port: 0,
    fetch() { return Response.redirect(new URL("/target", target.url), 302); },
  });
  try {
    await assert.rejects(
      executeRequest({
        method: "GET",
        url: redirect.url.toString(),
        auth: { kind: "server", token: "secret", source: "test" },
        headers: { "X-Postmark-Server-Token": "secret" },
        timeoutMs: 1000,
      }),
    );
  } finally {
    redirect.stop(true);
    target.stop(true);
  }
});
