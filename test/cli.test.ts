import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "cli.js");

test("CLI dry-runs mutating commands", () => {
  const output = execFileSync(
    process.execPath,
    [cli, "server", "update", "--server-token", "secret", "--set", "Name=Production", "--dry-run"],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(output);
  assert.equal(parsed.data.method, "PUT");
  assert.equal(parsed.data.url, "https://api.postmarkapp.com/server");
  assert.equal(parsed.data.headers["X-Postmark-Server-Token"], "[redacted]");
  assert.deepEqual(parsed.data.body, { Name: "Production" });
});

test("CLI requires --yes or --dry-run for mutations", () => {
  const result = spawnSync(process.execPath, [cli, "server", "update", "--server-token", "secret", "--set", "Name=Production"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 9);
  assert.match(result.stderr, /changes Postmark state/);
});

test("CLI dry-runs bodyless mutations without content-type", () => {
  const output = execFileSync(process.execPath, [cli, "bounces", "activate", "123", "--server-token", "secret", "--dry-run"], {
    encoding: "utf8",
  });
  const parsed = JSON.parse(output);
  assert.equal(parsed.data.method, "PUT");
  assert.equal(parsed.data.url, "https://api.postmarkapp.com/bounces/123/activate");
  assert.equal("Content-Type" in parsed.data.headers, false);
  assert.equal("body" in parsed.data, false);
});


test("CLI treats template validation as a read-only POST", () => {
  const result = spawnSync(process.execPath, [
    cli, "templates", "validate", "--server-token", "secret",
    "--set", "TemplateType=Standard", "--dry-run",
  ], { encoding: "utf8" });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.data.method, "POST");
});

test("CLI rejects removed command aliases", () => {
  for (const args of [
    ["email", "batch"],
    ["streams", "unarchive", "outbound"],
    ["messages", "outbound", "details", "id"],
    ["stats", "outbound", "opens"],
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.ok(JSON.parse(result.stderr).error);
  }
});

test("CLI rejects mixed complete-file and field input before confirmation", () => {
  const result = spawnSync(process.execPath, [
    cli, "server", "update", "--server-token", "secret",
    "--file", "request.json", "--set", "Name=Production",
  ], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(JSON.parse(result.stderr).error.message, /cannot be combined/);
});
