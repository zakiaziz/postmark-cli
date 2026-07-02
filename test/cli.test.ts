import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "cli.js");

test("CLI dry-runs mutating commands", () => {
  const output = execFileSync(
    process.execPath,
    [cli, "server", "update", "--server-token", "secret", "--name", "Production", "--dry-run"],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(output);
  assert.equal(parsed.method, "PUT");
  assert.equal(parsed.url, "https://api.postmarkapp.com/server");
  assert.equal(parsed.headers["X-Postmark-Server-Token"], "[redacted]");
  assert.deepEqual(parsed.body, { Name: "Production" });
});

test("CLI requires --yes or --dry-run for mutations", () => {
  const result = spawnSync(process.execPath, [cli, "server", "update", "--server-token", "secret", "--name", "Production"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /changes Postmark state/);
});

test("CLI dry-runs bodyless mutations without content-type", () => {
  const output = execFileSync(process.execPath, [cli, "bounces", "activate", "123", "--server-token", "secret", "--dry-run"], {
    encoding: "utf8",
  });
  const parsed = JSON.parse(output);
  assert.equal(parsed.method, "PUT");
  assert.equal(parsed.url, "https://api.postmarkapp.com/bounces/123/activate");
  assert.equal("Content-Type" in parsed.headers, false);
  assert.equal("body" in parsed, false);
});
