#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, getGlobalOptions, getString } from "./args.js";
import { loadRuntimeContext } from "./auth.js";
import {
  configDir,
  configGet,
  configPath,
  configSet,
  configUnset,
  deleteProfile,
  getActiveProfileName,
  listProfiles,
  profilePath,
  readConfig,
  requireProfile,
  setActiveProfileName,
  showProfile,
  writeProfile,
} from "./config.js";
import { endpoints, findEndpoint } from "./endpoints.js";
import { buildApiRequestPlan, buildRequestPlan, executeRequest, renderDryRun } from "./http.js";
import { printJson, printRedacted, printResult, printText } from "./output.js";
import type { GlobalOptions, HttpMethod, ParsedArgs, Profile } from "./types.js";
import {
  applyAssignments,
  assignmentsToQuery,
  mergeBody,
  parseValue,
  readJsonBody,
  unknownFlagsToBody,
  unknownFlagsToQuery,
} from "./values.js";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseArgs(argv);
  const options = getGlobalOptions(parsed);

  if (options.version) {
    printText(version());
    return;
  }

  if (options.help || parsed.command.length === 0) {
    printText(help());
    return;
  }

  await dispatch(parsed, options);
}

async function dispatch(parsed: ParsedArgs, options: GlobalOptions): Promise<void> {
  const [group, action] = parsed.command;

  if (group === "setup") {
    await runSetup(parsed, options);
    return;
  }

  if (group === "profiles") {
    runProfiles(parsed);
    return;
  }

  if (group === "config") {
    runConfig(parsed);
    return;
  }

  if (group === "auth") {
    await runAuth(parsed, options);
    return;
  }

  if (group === "completions") {
    runCompletions(action);
    return;
  }

  if (group === "api" && action === "request") {
    await runApiRequest(parsed, options);
    return;
  }

  if (group === "bounces" && action === "types") {
    printJson(bounceTypes());
    return;
  }

  if (group === "bounces" && action === "rebound-snippet") {
    printText("See https://postmarkapp.com/developer/api/bounce-api#rebound-javascript-snippet");
    return;
  }

  const match = findEndpoint(parsed.command);
  if (!match) {
    throw new Error(`Unknown command "${parsed.command.join(" ")}". Run postmark --help.`);
  }

  await runEndpoint(match.endpoint, match.params, parsed, options);
}

async function runEndpoint(
  endpoint: NonNullable<ReturnType<typeof findEndpoint>>["endpoint"],
  params: Record<string, string>,
  parsed: ParsedArgs,
  options: GlobalOptions,
): Promise<void> {
  if (endpoint.mutation && !options.yes && !options.dryRun) {
    throw new Error(`"${endpoint.name}" changes Postmark state. Re-run with --dry-run or --yes.`);
  }

  const context = loadRuntimeContext(options);
  const body = endpoint.method === "GET" ? undefined : buildBody(parsed, options);
  const query = endpoint.method === "GET" ? unknownFlagsToQuery(parsed.unknownFlags) : {};
  const plan = buildRequestPlan({
    endpoint,
    params,
    options,
    context,
    query,
    body,
  });

  if (options.dryRun) {
    printRedacted(renderDryRun(plan));
    return;
  }

  printResult(await executeRequest(plan));
}

async function runApiRequest(parsed: ParsedArgs, options: GlobalOptions): Promise<void> {
  const method = parsed.command[2]?.toUpperCase() as HttpMethod | undefined;
  const path = parsed.command[3];

  if (!method || !["GET", "POST", "PUT", "DELETE"].includes(method)) {
    throw new Error("Usage: postmark api request <GET|POST|PUT|DELETE> <path>");
  }

  if (!path) {
    throw new Error("Usage: postmark api request <GET|POST|PUT|DELETE> <path>");
  }

  const mutation = method !== "GET";
  if (mutation && !options.yes && !options.dryRun) {
    throw new Error('"api request" changes Postmark state. Re-run with --dry-run or --yes.');
  }

  const context = loadRuntimeContext(options);
  const body = method === "GET" ? undefined : buildBody(parsed, options);
  const query = method === "GET" ? unknownFlagsToQuery(parsed.unknownFlags) : {};
  const plan = buildApiRequestPlan({ method, path, options, context, query, body });

  if (options.dryRun) {
    printRedacted(renderDryRun(plan));
    return;
  }

  printResult(await executeRequest(plan));
}

async function runSetup(parsed: ParsedArgs, _options: GlobalOptions): Promise<void> {
  const profileName = getString(parsed.flags, "profile") ?? parsed.command[1] ?? "default";
  const fromEnv = Boolean(parsed.flags["from-env"]);
  const accountFromFlag = getString(parsed.flags, "account-token");
  const serverFromFlag = getString(parsed.flags, "server-token");
  const defaultServerId = getString(parsed.flags, "default-server-id");
  const defaultMessageStream = getString(parsed.flags, "default-message-stream");

  let accountToken = accountFromFlag;
  let serverToken = serverFromFlag;

  if (fromEnv) {
    accountToken = accountToken ?? process.env.POSTMARK_ACCOUNT_TOKEN;
    serverToken = serverToken ?? process.env.POSTMARK_SERVER_TOKEN;
  }

  if (!accountToken && !serverToken && process.stdin.isTTY) {
    const rl = createInterface({ input, output });
    try {
      accountToken = (await rl.question("Postmark account token (optional): ")).trim() || undefined;
      serverToken = (await rl.question("Postmark server token (optional): ")).trim() || undefined;
    } finally {
      rl.close();
    }
  }

  if (!accountToken && !serverToken) {
    throw new Error("Setup needs at least an account token or a server token");
  }

  const profile: Profile = {
    ...(accountToken ? { accountToken } : {}),
    ...(serverToken ? { serverToken } : {}),
    ...(defaultServerId ? { defaultServerId } : {}),
    ...(defaultMessageStream ? { defaultMessageStream } : {}),
  };

  writeProfile(profileName, profile);
  setActiveProfileName(profileName);
  printJson({
    profile: profileName,
    path: profilePath(profileName),
    active: true,
  });
}

function runProfiles(parsed: ParsedArgs): void {
  const action = parsed.command[1];
  const name = parsed.command[2] ?? getString(parsed.flags, "profile");

  switch (action) {
    case "list":
      printJson({ active: getActiveProfileName(), profiles: listProfiles() });
      return;
    case "show":
      if (!name) throw new Error("Usage: postmark profiles show <name>");
      printRedacted(showProfile(name));
      return;
    case "create":
    case "update": {
      if (!name) throw new Error(`Usage: postmark profiles ${action} <name> [--account-token ...] [--server-token ...]`);
      const existing = action === "update" ? requireProfile(name) : {};
      const profile: Profile = {
        ...existing,
        ...profileFieldsFromFlags(parsed),
      };
      writeProfile(name, profile);
      printJson({ profile: name, path: profilePath(name) });
      return;
    }
    case "delete":
      if (!name) throw new Error("Usage: postmark profiles delete <name>");
      deleteProfile(name);
      printJson({ deleted: name });
      return;
    case "use":
      if (!name) throw new Error("Usage: postmark profiles use <name>");
      requireProfile(name);
      setActiveProfileName(name);
      printJson({ active: name });
      return;
    default:
      throw new Error("Usage: postmark profiles <list|show|create|update|delete|use>");
  }
}

function runConfig(parsed: ParsedArgs): void {
  const action = parsed.command[1];
  const key = parsed.command[2];
  const value = parsed.command[3];

  switch (action) {
    case "path":
      printJson({ configDir: configDir(), configPath: configPath() });
      return;
    case "show":
      printRedacted(readConfig());
      return;
    case "get":
      if (!key) throw new Error("Usage: postmark config get <key>");
      printResult(configGet(key) ?? null);
      return;
    case "set":
      if (!key || value === undefined) throw new Error("Usage: postmark config set <key> <value>");
      printRedacted(configSet(key, parseValue(value)));
      return;
    case "unset":
      if (!key) throw new Error("Usage: postmark config unset <key>");
      printRedacted(configUnset(key));
      return;
    default:
      throw new Error("Usage: postmark config <path|show|get|set|unset>");
  }
}

async function runAuth(parsed: ParsedArgs, options: GlobalOptions): Promise<void> {
  const action = parsed.command[1] ?? "verify";
  if (!["verify", "verify-account", "verify-server"].includes(action)) {
    throw new Error("Usage: postmark auth <verify|verify-account|verify-server>");
  }

  const context = loadRuntimeContext(options);
  const checks =
    action === "verify-account"
      ? [{ method: "GET" as const, path: "/servers", auth: "account" as const, name: "account" }]
      : action === "verify-server"
        ? [{ method: "GET" as const, path: "/server", auth: "server" as const, name: "server" }]
        : [
            { method: "GET" as const, path: "/servers", auth: "account" as const, name: "account" },
            { method: "GET" as const, path: "/server", auth: "server" as const, name: "server" },
          ];

  const results: Record<string, unknown> = {};
  for (const check of checks) {
    try {
      const plan = buildApiRequestPlan({
        method: check.method,
        path: check.path,
        options: { ...options, auth: check.auth },
        context,
        query: check.name === "account" ? { count: "1" } : {},
      });
      await executeRequest(plan);
      results[check.name] = { ok: true };
    } catch (error) {
      results[check.name] = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  printJson(results);
}

function runCompletions(shell: string | undefined): void {
  switch (shell) {
    case "bash":
      printText(`_postmark_complete() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  COMPREPLY=( $(compgen -W "${topLevelWords().join(" ")}" -- "$cur") )
}
complete -F _postmark_complete postmark`);
      return;
    case "zsh":
      printText(`#compdef postmark
_arguments '*: :(${topLevelWords().join(" ")})'`);
      return;
    case "fish":
      printText(topLevelWords().map((word) => `complete -c postmark -f -a ${word}`).join("\n"));
      return;
    default:
      throw new Error("Usage: postmark completions <bash|zsh|fish>");
  }
}

function buildBody(parsed: ParsedArgs, options: GlobalOptions): unknown {
  if (!options.body && parsed.unknownFlags.length === 0 && options.set.length === 0) {
    return undefined;
  }

  const fileBody = readJsonBody(options.body);
  const generatedBody = unknownFlagsToBody(parsed.unknownFlags);
  applyAssignments(generatedBody, options.set);
  return mergeBody(fileBody, generatedBody);
}

function profileFieldsFromFlags(parsed: ParsedArgs): Profile {
  const accountToken = getString(parsed.flags, "account-token");
  const serverToken = getString(parsed.flags, "server-token");
  const defaultServerId = getString(parsed.flags, "default-server-id");
  const defaultMessageStream = getString(parsed.flags, "default-message-stream");
  const baseUrl = getString(parsed.flags, "base-url");

  return {
    ...(accountToken ? { accountToken } : {}),
    ...(serverToken ? { serverToken } : {}),
    ...(defaultServerId ? { defaultServerId } : {}),
    ...(defaultMessageStream ? { defaultMessageStream } : {}),
    ...(baseUrl ? { baseUrl } : {}),
  };
}

function help(): string {
  const rows = endpoints
    .map((endpoint) => `  ${endpoint.pattern.join(" ")}${" ".repeat(Math.max(1, 44 - endpoint.pattern.join(" ").length))}${endpoint.description}`)
    .join("\n");

  return `postmark ${version()}

Usage:
  postmark <command> [options]

Setup:
  postmark setup [--profile name] [--from-env]
  postmark profiles <list|show|create|update|delete|use>
  postmark config <path|show|get|set|unset>
  postmark auth <verify|verify-account|verify-server>
  postmark completions <bash|zsh|fish>

Global options:
  --profile <name>
  --account-token <token>
  --server-token <token>
  --auth <account|server>
  --base-url <url>
  --body @file.json
  --set Key=value
  --query key=value
  --server <id>
  --message-stream <stream-id>
  --dry-run
  --yes
  --json

API escape hatch:
  postmark api request <GET|POST|PUT|DELETE> <path>

API commands:
${rows}
  bounces types                              List documented bounce type names.
  bounces rebound-snippet                    Show rebound snippet docs URL.
`;
}

function topLevelWords(): string[] {
  return Array.from(
    new Set([
      ...endpoints.flatMap((endpoint) => endpoint.pattern),
      "api",
      "request",
      "setup",
      "profiles",
      "config",
      "auth",
      "completions",
      "--profile",
      "--account-token",
      "--server-token",
      "--auth",
      "--body",
      "--set",
      "--query",
      "--dry-run",
      "--yes",
      "--help",
      "--version",
    ]),
  ).sort();
}

function version(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const packagePath = join(dirname(currentFile), "..", "package.json");
  const fallbackPath = join(dirname(currentFile), "..", "..", "package.json");
  try {
    return JSON.parse(readFileSync(packagePath, "utf8")).version as string;
  } catch {
    return JSON.parse(readFileSync(fallbackPath, "utf8")).version as string;
  }
}

function bounceTypes(): string[] {
  return [
    "HardBounce",
    "Transient",
    "Unsubscribe",
    "Subscribe",
    "AutoResponder",
    "AddressChange",
    "DnsError",
    "SpamNotification",
    "OpenRelayTest",
    "Unknown",
    "SoftBounce",
    "VirusNotification",
    "ChallengeVerification",
    "BadEmailAddress",
    "SpamComplaint",
    "ManuallyDeactivated",
    "Unconfirmed",
    "Blocked",
    "SMTPApiError",
    "InboundError",
    "DMARCPolicy",
    "TemplateRenderingFailed",
  ];
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
