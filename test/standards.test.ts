import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "../src/args.js";
import { setPath } from "../src/values.js";
let config: string;
beforeEach(() => { config = mkdtempSync(join(tmpdir(), "postmark-standards-")); });
afterEach(() => { rmSync(config, { recursive: true, force: true }); });
async function run(args: string[], url?: string, content?: string) {
  const child = Bun.spawn([process.execPath, "src/cli.ts", ...args], {
    cwd: join(import.meta.dir, ".."),
    env: { PATH: process.env.PATH, XDG_CONFIG_HOME: config, CI: "1", POSTMARK_SERVER_TOKEN: "fake-token", ...(url ? { POSTMARK_BASE_URL: url } : {}) },
    stdin: content === undefined ? "ignore" : new Blob([content]), stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, exit };
}
test("config list/get route correctly and reject extra arguments", async () => {
  expect((await run(["config", "set", "baseUrl", "http://localhost:9000"])).exit).toBe(0);
  expect(JSON.parse((await run(["config", "get", "baseUrl"])).stdout).data).toEqual({ key: "baseUrl", value: "http://localhost:9000" });
  expect(JSON.parse((await run(["config", "list"])).stdout).data.baseUrl).toBe("http://localhost:9000");
  expect((await run(["config", "get", "baseUrl", "extra"])).exit).toBe(2);
});
test("local bounce types has collection output", async () => {
  const result = await run(["bounces", "types", "list"]);
  expect(result.exit).toBe(0); expect(JSON.parse(result.stdout).data).toContain("HardBounce");
});
test("parse failures honor pretty and reject undeclared spellings", async () => {
  const result = await run(["profiles", "list", "--format", "pretty", "--profile", "a", "--profile", "b"]);
  expect(result.exit).toBe(2); expect(result.stderr.startsWith("{\n")).toBe(true);
  for (const option of ["--q", "-quiet", "---quiet"]) expect(() => parseArgs(["profiles", "list", option])).toThrow();
  expect(parseArgs(["api", "request", "POST", "/email", "--file", "-"]).flags.file).toBe("-");
});
test("config cannot overwrite prototypes", () => {
  for (const path of ["__proto__.changed", "constructor.prototype.changed", "a..b"]) expect(() => setPath({}, path, 1)).toThrow();
  expect(({} as Record<string, unknown>).changed).toBeUndefined();
});
test("template validation sends read-only POST without confirmation", async () => {
  let calls = 0;
  const server = Bun.serve({ port: 0, fetch() { calls++; return Response.json({ AllContentIsValid: true }); } });
  try {
    const result = await run(["templates", "validate", "--set", "TemplateType=Standard"], server.url.toString());
    expect(result.exit).toBe(0); expect(calls).toBe(1);
  } finally { server.stop(true); }
});
test("invalid mutation body fails before confirmation or a request", async () => {
  const result = await run(["server", "update", "--file", "-"], undefined, "[]");
  expect(result.exit).toBe(2); expect(result.stdout).toBe("");
});
test("raw safe methods reject mutation-only inputs and cross-origin paths", async () => {
  let calls = 0;
  const server = Bun.serve({ port: 0, fetch() { calls++; return Response.json({}); } });
  try {
    for (const args of [["api", "request", "GET", "/server", "--yes"], ["api", "request", "GET", "//other.invalid/x"], ["api", "request", "POST", "/email", "--set", "Name=test", "--yes"]]) {
      expect((await run(args, server.url.toString())).exit).toBe(2);
    }
    expect(calls).toBe(0);
  } finally { server.stop(true); }
});
test("batch partial responses expose all outcomes and exit 8", async () => {
  const outcomes = [{ ErrorCode: 0, MessageID: "sent" }, { ErrorCode: 422, Message: "Failed" }];
  const server = Bun.serve({ port: 0, fetch() { return Response.json(outcomes); } });
  try {
    const result = await run(["emails", "batch-send", "--file", "-", "--yes"], server.url.toString(), '[{"To":"one"},{"To":"two"}]');
    expect(result.exit).toBe(8); expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr).error.partial).toEqual(outcomes);
  } finally { server.stop(true); }
});
test("raw text and empty output preserve provider shape; binary fails", async () => {
  let mode = "text";
  const server = Bun.serve({ port: 0, fetch() { return mode === "text" ? new Response("body", { headers: { "Content-Type": "text/plain" } }) : mode === "empty" ? new Response(null, { status: 204 }) : new Response(new Uint8Array([0, 1]), { headers: { "Content-Type": "application/octet-stream" } }); } });
  try {
    expect(JSON.parse((await run(["api", "request", "GET", "/x"], server.url.toString())).stdout)).toBe("body");
    mode = "empty"; expect(JSON.parse((await run(["api", "request", "GET", "/x"], server.url.toString())).stdout)).toBeNull();
    mode = "binary"; expect((await run(["api", "request", "GET", "/x"], server.url.toString())).exit).toBe(1);
  } finally { server.stop(true); }
});
test("auth verify uses configured token classes and preserves HTTP failure exit", async () => {
  const server = Bun.serve({ port: 0, fetch() { return Response.json({ ErrorCode: 10, Message: "denied" }, { status: 401, headers: { "x-postmark-request-id": "req-1" } }); } });
  try {
    const result = await run(["auth", "verify"], server.url.toString());
    expect(result.exit).toBe(3); expect(JSON.parse(result.stderr).error.request_id).toBe("req-1");
  } finally { server.stop(true); }
});
test("single-response lists reject invented pagination", async () => {
  for (const resource of ["streams", "webhooks"]) expect((await run([resource, "list", "--all"])).exit).toBe(2);
});
test("help resolves identifiers and advertises canonical commands", async () => {
  for (const args of [["messages", "outbound", "get", "id"], ["profiles", "get", "work"], ["stats", "outbound", "get"]]) {
    const result = await run([...args, "--help"]); expect(result.exit).toBe(0); expect(result.stdout).toContain("Options:");
  }
  const output = (await run(["messages", "outbound", "get", "--help"])).stdout;
  expect(output).toContain("postmark messages outbound get"); expect(output).not.toContain("outbound details");
});
