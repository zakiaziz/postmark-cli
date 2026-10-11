#!/usr/bin/env node
import { CliError, asCliError } from "./errors.js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stderr as output } from "node:process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, getGlobalOptions, getString } from "./args.js";
import { loadRuntimeContext, resolveAuth } from "./auth.js";
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
  readProfile,
  requireProfile,
  setActiveProfileName,
  showProfile,
  writeProfile,
} from "./config.js";
import { globalFlags, utilityCommands, endpointFlags, canonicalUsage, optionHelp } from "./commands.js";
import { endpoints, findEndpoint } from "./endpoints.js";
import { PartialCompletionError } from "./errors.js";
import { redactedUrl, buildApiRequestPlan, buildRequestPlan, executeRequest, renderDryRun } from "./http.js";
import { configureOutput, printDiagnostic, printError, printJson, printRedacted, printResult, printText } from "./output.js";
import type { Endpoint, GlobalOptions, HttpMethod, ParsedArgs, Profile, RequestPlan } from "./types.js";
import {
  isObject,
  applyAssignments,
  parseValue,
  readJsonBody,
} from "./values.js";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  preconfigureOutput(argv);
  const parsed = parseArgs(argv);
  const options = getGlobalOptions(parsed);
  configureOutput(options);
  rejectUnknownOptions(parsed);
  if (options.quiet && options.verbose) throw new CliError("--quiet and --verbose cannot be used together");

  if (options.profile && parsed.command[0] !== "setup" && !options.help && !options.version && !readProfile(options.profile)) throw new CliError("Selected profile does not exist", "CONFIGURATION_ERROR", 3);

  if (options.version) {
    printText("postmark " + version());
    return;
  }

  if (options.help || parsed.command.length === 0) {
    printText(parsed.command.length === 0 ? help() : commandHelp(parsed.command));
    return;
  }

  rejectUnknownOptions(parsed);
  await dispatch(parsed, options);
}

async function dispatch(parsed: ParsedArgs, options: GlobalOptions): Promise<void> {
  const [group, action] = parsed.command;

  if (group === "setup") {
    assertAllowedFlags(parsed, ["profile", "account-token", "server-token", "default-server-id", "default-message-stream", "base-url", "from-env"]);
    if (parsed.command.length > 2) throw new CliError("Usage: postmark setup [profile]");
    await runSetup(parsed, options);
    return;
  }

  if (group === "profiles") {
    const profileAllowed = ["create", "update"].includes(action ?? "") ? ["account-token", "server-token", "default-server-id", "default-message-stream", "base-url"] : [];
    assertAllowedFlags(parsed, profileAllowed);
    runProfiles(parsed);
    return;
  }

  if (group === "config") {
    assertAllowedFlags(parsed, []);
    runConfig(parsed);
    return;
  }

  if (group === "auth") {
    assertAllowedFlags(parsed, ["profile", "account-token", "server-token", "base-url", "auth"]);
    await runAuth(parsed, options);
    return;
  }

  if (group === "completions") {
    assertAllowedFlags(parsed, []);
    if (parsed.command.length !== 2) throw new CliError("Usage: postmark completions <bash|zsh|fish>");
    runCompletions(action);
    return;
  }

  if (group === "api" && action === "request") {
    assertAllowedFlags(parsed, utilityCommands["api request"]!.flags);
    await runApiRequest(parsed, options);
    return;
  }

  if (group === "bounces" && action === "types" && parsed.command[2] === "list") {
    assertAllowedFlags(parsed, []);
    if (parsed.command.length !== 3) throw new CliError("Usage: postmark bounces types list");
    printJson(bounceTypes());
    return;
  }

  if (group === "bounces" && action === "rebound-snippet" && parsed.command[2] === "get") {
    assertAllowedFlags(parsed, []);
    if (parsed.command.length !== 3) throw new CliError("Usage: postmark bounces rebound-snippet get");
    printJson({ url: "https://postmarkapp.com/developer/api/bounce-api#rebound-javascript-snippet" });
    return;
  }

  const match = findEndpoint(normalizeCommand(parsed, options));
  if (!match) {
    throw new CliError(`Unknown command "${parsed.command.join(" ")}". Run postmark --help.`);
  }

  await runEndpoint(match.endpoint, match.params, parsed, options);
}

async function runEndpoint(
  endpoint: NonNullable<ReturnType<typeof findEndpoint>>["endpoint"],
  params: Record<string, string>,
  parsed: ParsedArgs,
  options: GlobalOptions,
): Promise<void> {
  assertAllowedFlags(parsed, endpointFlags(endpoint));
  validateEndpointOptions(endpoint, parsed, options);
  const context = loadRuntimeContext(options);
  const body = endpoint.method === "GET" ? undefined : buildBody(options);
  validateBody(endpoint, body);
  const plan = buildRequestPlan({ endpoint, params, options, context, query: paginationQuery(endpoint, options), body });
  await requireMutationConfirmation(endpoint.name, Boolean(endpoint.mutation), options, context.profileName, plan);
  if (options.verbose) printDiagnostic({ diagnostic: renderDryRun(plan) });
  if (options.dryRun) { printRedacted(renderDryRun(plan)); return; }
  if (options.all && isCollection(endpoint)) {
    printResult(await executeAllPages(endpoint, plan, options));
    return;
  }
  const result = await executeRequest(plan);
  if (endpoint.method === "GET" && !isCollection(endpoint) && result === null) throw new CliError("Requested resource was not returned", "NOT_FOUND", 5);
  checkPartial(endpoint, result);
  printResult(firstClassResult(endpoint, result, options));
}

async function runApiRequest(parsed: ParsedArgs, options: GlobalOptions): Promise<void> {
  const method = parsed.command[2]?.toUpperCase() as HttpMethod | undefined;
  const path = parsed.command[3];

  if (!method || !["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(method)) {
    throw new CliError("Usage: postmark api request <GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS> <path>");
  }

  if (!path) {
    throw new CliError("Usage: postmark api request <GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS> <path>");
  }

  if (parsed.command.length !== 4) throw new CliError("Usage: postmark api request <GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS> <path>");
  const read = ["GET", "HEAD", "OPTIONS"].includes(method);
  if (read && (options.file || options.set.length || options.yes || options.dryRun)) throw new CliError("Read-only raw requests do not accept body or confirmation options");

  const context = loadRuntimeContext(options);
  const body = ["GET", "HEAD", "OPTIONS"].includes(method) ? undefined : buildBody(options);
  const query: readonly (readonly [string, string])[] = [];
  const plan = buildApiRequestPlan({ method, path, options, context, query, body });
  await requireMutationConfirmation("api request", !read, options, context.profileName, plan);

  if (options.verbose) printDiagnostic({ diagnostic: renderDryRun(plan) });
  if (options.dryRun) {
    printRedacted(renderDryRun(plan));
    return;
  }

  printResult(await executeRequest(plan));
}

async function runSetup(parsed: ParsedArgs, _options: GlobalOptions): Promise<void> {
  const profileName = getString(parsed.flags, "profile") ?? parsed.command[1] ?? "default";
  if (parsed.command[1] && _options.profile && parsed.command[1] !== _options.profile) throw new CliError("Setup positional profile conflicts with --profile");
  if (readProfile(profileName)) throw new CliError("Profile already exists; use profiles update", "CONFLICT", 6);
  const fromEnv = parsed.flags["from-env"] === true;
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


  if (!accountToken && !serverToken) {
    throw new CliError("Setup needs at least an account token or a server token", "CONFIGURATION_ERROR", 3);
  }

  const profile: Profile = {
    ...(getString(parsed.flags, "base-url") ? { baseUrl: getString(parsed.flags, "base-url") } : {}),
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
      if (parsed.command.length !== 2) throw new CliError("Usage: postmark profiles list");
      printResult({ data: listProfiles(), meta: { active: getActiveProfileName() } });
      return;
    case "get":
      if (!name || parsed.command.length !== 3) throw new CliError("Usage: postmark profiles get <name>");
      printRedacted(showProfile(name));
      return;
    case "create":
    case "update": {
      if (parsed.command.length !== 3) throw new CliError("Usage: postmark profiles " + action + " <name> [options]");
      if (!name) throw new CliError(`Usage: postmark profiles ${action} <name> [--account-token ...] [--server-token ...]`);
      if (action === "create" && readProfile(name)) throw new CliError("Profile already exists; use profiles update", "CONFLICT", 6);
      if (Object.keys(profileFieldsFromFlags(parsed)).length === 0) throw new CliError("Profile " + action + " requires at least one field");
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
      if (!name || parsed.command.length !== 3) throw new CliError("Usage: postmark profiles delete <name>");
      deleteProfile(name);
      printJson({ deleted: name });
      return;
    case "use":
      if (!name || parsed.command.length !== 3) throw new CliError("Usage: postmark profiles use <name>");
      requireProfile(name);
      setActiveProfileName(name);
      printJson({ active: name });
      return;
    default:
      throw new CliError("Usage: postmark profiles <list|get|create|update|delete|use>");
  }
}

function runConfig(parsed: ParsedArgs): void {
  const action = parsed.command[1];
  const key = parsed.command[2];
  const value = parsed.command[3];

  switch (action) {
    case "path":
      if (parsed.command.length !== 2) throw new CliError("Usage: postmark config path");
      printJson({ configDir: configDir(), configPath: configPath() });
      return;
    case "list":
      if (parsed.command.length !== 2) throw new CliError("Usage: postmark config list");
      printRedacted(readConfig());
      return;
    case "get":
      if (!key || parsed.command.length !== 3) throw new CliError("Usage: postmark config get <key>");
      printJson({ key, value: configGet(key) ?? null });
      return;
    case "set":
      if (!key || value === undefined || parsed.command.length !== 4) throw new CliError("Usage: postmark config set <key> <value>");
      printRedacted(configSet(key, parseValue(value)));
      return;
    case "unset":
      if (!key || parsed.command.length !== 3) throw new CliError("Usage: postmark config unset <key>");
      printRedacted(configUnset(key));
      return;
    default:
      throw new CliError("Usage: postmark config <path|list|get|set|unset>");
  }
}

async function runAuth(parsed: ParsedArgs, options: GlobalOptions): Promise<void> {
  if (parsed.command.length !== 2 || parsed.command[1] !== "verify") throw new CliError("Usage: postmark auth verify [--auth account|server]");
  const context = loadRuntimeContext(options);
  const account = resolveAuth("account", { ...options, auth: "account" }, context);
  const server = resolveAuth("server", { ...options, auth: "server" }, context);
  const kinds = options.auth ? [options.auth] : [account.token ? "account" : undefined, server.token ? "server" : undefined].filter(Boolean) as ("account" | "server")[];
  if (!kinds.length) throw new CliError("Set POSTMARK_ACCOUNT_TOKEN or POSTMARK_SERVER_TOKEN before auth verify", "AUTHENTICATION_REQUIRED", 3);
  const results: Record<string, unknown> = {};
  let failure: unknown;
  for (const kind of kinds) {
    try {
      const plan = buildApiRequestPlan({ method: "GET", path: kind === "account" ? "/servers" : "/server", options: { ...options, auth: kind }, context, query: kind === "account" ? [["count", "1"], ["offset", "0"]] : [] });
      await executeRequest(plan);
      results[kind] = { ok: true };
    } catch (error) {
      failure = error;
      const typed = asCliError(error);
      results[kind] = { ok: false, error: { code: typed.code, message: typed.message, ...typed.details } };
    }
  }
  if (failure) {
    if (Object.values(results).some(result => isObject(result) && result.ok === true)) throw new PartialCompletionError(results, "Some authentication checks failed.");
    throw failure;
  }
  printJson(results);
}

function runCompletions(shell: string | undefined): void {
  switch (shell) {
    case "bash":
      printText(`_postmark_complete() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  COMPREPLY=( $(compgen -W "${completionWords().join(" ")}" -- "$cur") )
}
complete -F _postmark_complete postmark`);
      return;
    case "zsh":
      printText(`#compdef postmark
_arguments '*: :(${completionWords().join(" ")})'`);
      return;
    case "fish":
      printText(completionWords().map((word) => `complete -c postmark -f -a ${word}`).join("\n"));
      return;
    default:
      throw new CliError("Usage: postmark completions <bash|zsh|fish>");
  }
}

function buildBody(options: GlobalOptions): unknown {
  if (!options.file && options.set.length === 0) return undefined;
  if (options.file && options.set.length > 0) throw new CliError("--file cannot be combined with --set");
  if (options.file) return readJsonBody(options.file);
  const generatedBody: Record<string, unknown> = {};
  applyAssignments(generatedBody, options.set);
  return generatedBody;
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




const presentationFlags = globalFlags;
function assertAllowedFlags(parsed: ParsedArgs, allowed: readonly string[]): void {
  const accepted = new Set([...presentationFlags, ...allowed]);
  for (const name of Object.keys(parsed.flags)) {
    if (!accepted.has(name)) throw new CliError("Option " + JSON.stringify("--" + name) + " is not valid for this command");
  }
}


function preconfigureOutput(argv: readonly string[]): void {
  let format: GlobalOptions["format"] = "json";
  let color: GlobalOptions["color"] = "auto";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--") break;
    const [token, inline] = (argv[index] ?? "").split("=", 2);
    if (token === "--format") {
      const value = inline ?? argv[index + 1];
      if (value === "json" || value === "pretty" || value === "human") format = value;
    }
    if (token === "--color") {
      const value = inline ?? argv[index + 1];
      if (value === "auto" || value === "always" || value === "never") color = value;
    }
  }
  configureOutput({ format, color });
}

function rejectUnknownOptions(parsed: ParsedArgs): void {
  const flag = parsed.unknownFlags[0];
  if (flag) throw new CliError("Unknown option " + JSON.stringify("--" + flag.name) + ". Use --query for query parameters or --set for body fields.");
}
function validateEndpointOptions(endpoint: NonNullable<ReturnType<typeof findEndpoint>>["endpoint"], parsed: ParsedArgs, options: GlobalOptions): void {
  if (options.file && options.set.length) throw new CliError("--file cannot be combined with --set");
  if (endpoint.method === "GET" && (options.file || options.set.length)) throw new CliError("GET commands do not accept --file or --set");
  if (endpoint.method !== "GET" && options.query.length) throw new CliError("Mutation commands do not accept --query");
  const collection = !!endpoint.pagination;
  if ((options.all || options.cursor || options.pageSize || options.maxItems) && !collection) throw new CliError("Pagination options are not supported by " + JSON.stringify(endpoint.name));
  if (options.cursor !== undefined && (!/^[0-9]+$/.test(options.cursor) || !Number.isSafeInteger(Number(options.cursor)))) throw new CliError("--cursor must be a nonnegative integer offset");
  if (endpoint.pagination && options.pageSize && options.pageSize > endpoint.pagination.maxPageSize) throw new CliError("--page-size must be at most " + endpoint.pagination.maxPageSize);
  if (options.query.some(value => /^(count|offset)=/i.test(value)) && endpoint.pagination) throw new CliError("Use --page-size and --cursor instead of count/offset query assignments");
  if (options.maxItems && !options.all) throw new CliError("--max-items requires --all");
}
async function requireMutationConfirmation(name:string,mutation:boolean,options:GlobalOptions, profile?:string, plan?:RequestPlan):Promise<void>{
  if(!mutation||options.yes||options.dryRun)return;
  const ci=process.env.CI; const noninteractive=options.noInput||options.file==="-"||!process.stdin.isTTY||(ci!==undefined&&!["","0","false"].includes(ci.toLowerCase()));
  if(noninteractive)throw new CliError(JSON.stringify(name)+" changes Postmark state. Re-run with --dry-run or --yes.", "CONFIRMATION_REQUIRED", 9);
  process.stderr.write("Profile: "+(profile??"environment/default")+"\nTarget: "+(plan ? redactedUrl(plan.url) : name)+"\nOperation: "+name+"\nEffect: changes Postmark state\n");
  const rl=createInterface({input,output}); try{const answer=await rl.question("Continue? [y/N] ");if(!["y","yes"].includes(answer.trim().toLowerCase()))throw new CliError(JSON.stringify(name)+" changes Postmark state and confirmation was declined.", "CONFIRMATION_DECLINED", 9);}finally{rl.close();}
}
function normalizeCommand(parsed: ParsedArgs, options: GlobalOptions): string[] {
  const command = [...parsed.command];
  if (command[0] === "stats" && command[1] === "outbound") {
    if (command.length !== 3 || command[2] !== "get") throw new CliError("Usage: postmark stats outbound get --metric <metric>");
    if (!options.metric) throw new CliError("--metric is required by stats outbound get");
    command[2] = options.metric;
  }
  return command;
}


function validateBody(endpoint: Endpoint, body: unknown): void {
  const bodyless = endpoint.method === "DELETE" || endpoint.method === "GET" || ["bounces activate", "streams archive", "streams restore", "messages inbound bypass", "messages inbound retry", "domains verify-dkim", "domains verify-return-path", "domains verify-spf", "domains rotate-dkim", "signatures resend-confirmation", "signatures verify-spf", "signatures request-new-dkim"].includes(endpoint.name);
  if (bodyless) {
    if (body !== undefined) throw new CliError(endpoint.name + " does not accept a body");
    return;
  }
  if (endpoint.name === "emails batch-send") {
    validateBatch(body, 500);
    return;
  }
  if (!isObject(body) || Object.keys(body).length === 0) throw new CliError(endpoint.name + " requires a nonempty JSON object through --file or --set");
  if (endpoint.name === "templates batch-send") validateBatch(body.Messages, 500);
  if (endpoint.name.startsWith("suppressions batch-")) {
    validateBatch(body.Suppressions, 50);
    for (const item of body.Suppressions as Record<string, unknown>[]) {
      if (typeof item.EmailAddress !== "string" || !item.EmailAddress) throw new CliError("Each suppression must have an explicit EmailAddress");
    }
  }
}
function validateBatch(items: unknown, maximum: number): void {
  if (!Array.isArray(items) || items.length === 0 || items.length > maximum || items.some(item => !isObject(item) || Object.keys(item).length === 0)) throw new CliError("Batch input must contain between 1 and " + maximum + " nonempty objects");
}
function checkPartial(endpoint: Endpoint, result: unknown): void {
  const items = endpoint.name.endsWith("batch-send") ? result
    : endpoint.name.startsWith("suppressions batch-") && isObject(result) ? result.Suppressions : undefined;
  if (items !== undefined) {
    if (!Array.isArray(items)) throw new CliError("Provider returned an invalid batch response", "INVALID_RESPONSE", 1);
    if (items.some(item => isObject(item) && ((typeof item.ErrorCode === "number" && item.ErrorCode !== 0) || item.Status === "Failed"))) throw new PartialCompletionError(items);
  }
}
function collection(endpoint: Endpoint, value: unknown): { rows: unknown[]; metadata: Record<string, unknown> } {
  if (!isObject(value) || !endpoint.collectionKey || !Array.isArray(value[endpoint.collectionKey])) throw new CliError("Provider response is missing collection " + endpoint.collectionKey, "INVALID_RESPONSE", 1);
  const { [endpoint.collectionKey]: rows, ...metadata } = value;
  return { rows: rows as unknown[], metadata };
}
async function executeAllPages(endpoint: Endpoint, initialPlan: RequestPlan, options: GlobalOptions): Promise<unknown> {
  let offset = Number(options.cursor ?? 0);
  const results: unknown[] = [];
  for (;;) {
    const remaining = options.maxItems === undefined ? Infinity : options.maxItems - results.length;
    const count = Math.min(options.pageSize ?? endpoint.pagination!.defaultPageSize, remaining, (endpoint.pagination!.maxOffset ?? Infinity) - offset);
    if (count <= 0) throw new CliError("Provider pagination limit reached; narrow the query", "PAGINATION_LIMIT", 1);
    const url = new URL(initialPlan.url);
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("count", String(count));
    const payload = await executeRequest({ ...initialPlan, url: url.toString() });
    const { rows, metadata } = collection(endpoint, payload);
    if (rows.length > count) throw new CliError("Provider ignored the page bound; safe continuation is unavailable", "INVALID_RESPONSE", 1);
    results.push(...rows);
    offset += rows.length;
    const total = typeof metadata.TotalCount === "number" ? metadata.TotalCount : undefined;
    const done = rows.length === 0 || (total === undefined ? rows.length < count : offset >= total);
    const capped = !done && endpoint.pagination!.maxOffset !== undefined && offset >= endpoint.pagination!.maxOffset;
    if (done || capped || results.length >= (options.maxItems ?? Infinity)) return { data: results, meta: { ...metadata, next_cursor: done || capped ? null : String(offset), has_more: !done, ...(capped ? { truncated: true, limitation: "Provider offset limit reached; narrow the query" } : {}) } };
  }
}
function paginationQuery(endpoint: Endpoint, options: GlobalOptions): readonly (readonly [string, string])[] {
  if (!endpoint.pagination) return [];
  const offset = Number(options.cursor ?? 0);
  const count = Math.min(options.pageSize ?? endpoint.pagination.defaultPageSize, (endpoint.pagination.maxOffset ?? Infinity) - offset);
  if (count <= 0) throw new CliError("--cursor exceeds the provider pagination limit; narrow the query");
  return [["offset", String(offset)], ["count", String(count)]];
}
function isCollection(endpoint: Endpoint): boolean { return endpoint.collectionKey !== undefined; }
function firstClassResult(endpoint: Endpoint, value: unknown, options: GlobalOptions): unknown {
  if (endpoint.name.startsWith("suppressions batch-") && isObject(value)) return { data: value.Suppressions, meta: {} };
  if (!isCollection(endpoint)) return { data: value, meta: {} };
  const { rows, metadata } = collection(endpoint, value);
  if (!endpoint.pagination) return { data: rows, meta: metadata };
  const offset = Number(options.cursor ?? 0) + rows.length;
  const count = Number(paginationQuery(endpoint, options)[1]![1]);
  const total = typeof metadata.TotalCount === "number" ? metadata.TotalCount : undefined;
  const hasMore = rows.length > 0 && (total === undefined ? rows.length >= count : offset < total);
  const capped = hasMore && endpoint.pagination.maxOffset !== undefined && offset >= endpoint.pagination.maxOffset;
  return { data: rows, meta: { ...metadata, next_cursor: hasMore && !capped ? String(offset) : null, has_more: hasMore, ...(capped ? { truncated: true, limitation: "Provider offset limit reached; narrow the query" } : {}) } };
}


function help(): string {
  return ["postmark " + version(), "", "Usage: postmark <resource> <action> [identifier] [options]", "", "Global options:",
    ...globalFlags.map(flag => "  --" + flag + "  " + optionHelp[flag]), "", "Commands:",
    ...endpoints.map(endpoint => "  postmark " + canonicalUsage(endpoint) + "\n    " + endpoint.description),
    ...Object.values(utilityCommands).map(item => "  postmark " + item.usage + "\n    " + item.description),
    "", "Use <command> --help for arguments, options, effects, and examples."].join("\n");
}
function commandHelp(command: readonly string[]): string {
  const name = command.join(" ");
  const matches = endpoints.filter(endpoint => {
    const canonical = canonicalUsage(endpoint).split(" --")[0]!.replace(/ <[^>]+>/g, "");
    return canonical === name || canonical.startsWith(name + " ") || name.startsWith(canonical + " ");
  });
  const utilities = Object.entries(utilityCommands).filter(([key]) => key === name || key.startsWith(name + " ") || name.startsWith(key + " "));
  if (!matches.length && !utilities.length) throw new CliError("Unknown command " + JSON.stringify(name));
  return [
    ...matches.map(endpoint => [
      endpoint.description, "", "Usage:", "  postmark " + canonicalUsage(endpoint), "", "Options:",
      ...[...globalFlags, ...endpointFlags(endpoint)].map(flag => "  --" + flag + "  " + optionHelp[flag]),
      "", "Output:", "  json/pretty: {data,meta}; human: table or labeled fields.",
      endpoint.pagination ? "  One page by default; meta.next_cursor resumes. Provider ordering is retained." : "  No pagination options; provider response is returned in one request.",
      endpoint.pagination?.maxOffset ? "  Provider count + offset limit: " + endpoint.pagination.maxOffset + "; narrow filters beyond this boundary." : "",
      "", "Effects:", endpoint.mutation ? "  Remote mutation; --yes or terminal confirmation required. Dry runs are local and write-free. Batches can partially succeed; no rollback." : "  Read-only; no mutation confirmation.",
      "", "Example:", "  postmark " + canonicalUsage(endpoint) + (endpoint.mutation ? " --dry-run" : " --format pretty"),
      "", "Failures:", "  2 input; 3 auth/config; 4 permission; 5 missing; 6 conflict; 7 transient; 8 partial with error.partial; 9 confirmation.",
    ].filter(line => line !== undefined).join("\n")),
    ...utilities.map(([key, item]) => [
      item.description, "", "Usage:", "  postmark " + item.usage, "", "Options:",
      ...[...globalFlags, ...item.flags].map(flag => "  --" + flag + "  " + optionHelp[flag]),
      "", "Output:", key.startsWith("completions") ? "  Shell source as text." : key === "api request" ? "  Provider JSON shape, text string, or null. Binary is unsupported." : "  {data,meta} in json/pretty; labeled fields in human.",
      "", "Effects:", key === "api request" ? "  Non-GET/HEAD/OPTIONS requires confirmation; local --dry-run makes no requests." : "  Local profile/config operations can write local files; auth verify is a remote read.",
      "", "Example:", "  postmark " + item.usage + " --help",
      "", "Failures:", "  2 invalid input; 3 auth/config; 5 missing profile; 6 conflict; provider errors use standard exit codes.",
    ].join("\n")),
  ].join("\n\n");
}
function completionWords(): string[] {
  return [...new Set([
    ...endpoints.flatMap(endpoint => canonicalUsage(endpoint).split(" ").filter(word => !word.startsWith("<"))),
    ...Object.keys(utilityCommands).flatMap(key => key.split(" ")),
    ...globalFlags.map(flag => "--" + flag),
    ...endpoints.flatMap(endpoint => endpointFlags(endpoint).map(flag => "--" + flag)),
    ...Object.values(utilityCommands).flatMap(item => item.flags.map(flag => "--" + flag)),
    ...listProfiles(), "json", "pretty", "human", "auto", "always", "never", "account", "server",
  ])].sort();
}

process.on("SIGINT", () => { printError(new CliError("Interrupted", "INTERRUPTED", 130)); process.exit(130); });
main().catch((error: unknown) => {
  printError(error);
  process.exitCode = asCliError(error).exitCode;
});
