import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { endpoints } from "../src/endpoints.js";

const readme = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "README.md"), "utf8");

test("README documents every registered API command", () => {
  for (const endpoint of endpoints) {
    const command = endpoint.pattern.join(" ").replace(/:([A-Za-z0-9_]+)/g, "<$1>");
    assert.match(readme, new RegExp(escapeRegExp(`postmark ${command}`)), `missing postmark ${command}`);
  }
});

test("README documents every built-in command", () => {
  for (const command of [
    "setup",
    "profiles list",
    "profiles show <name>",
    "profiles create <name>",
    "profiles update <name>",
    "profiles delete <name>",
    "profiles use <name>",
    "config path",
    "config show",
    "config get <key>",
    "config set <key> <value>",
    "config unset <key>",
    "auth verify",
    "auth verify-account",
    "auth verify-server",
    "completions bash",
    "completions zsh",
    "completions fish",
    "api request",
    "bounces types",
    "bounces rebound-snippet",
  ]) {
    assert.match(readme, new RegExp(escapeRegExp(`postmark ${command}`)), `missing postmark ${command}`);
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
