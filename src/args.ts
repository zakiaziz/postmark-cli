import type { GlobalOptions, ParsedArgs, UnknownFlag } from "./types.js";

const valueFlags = new Set([
  "profile",
  "account-token",
  "server-token",
  "auth",
  "base-url",
  "body",
  "data",
  "set",
  "query",
  "server",
  "message-stream",
  "default-server-id",
  "default-message-stream",
]);

const booleanFlags = new Set([
  "yes",
  "force",
  "dry-run",
  "json",
  "help",
  "version",
  "from-env",
]);

const aliases: Record<string, string> = {
  h: "help",
  v: "version",
  y: "yes",
};

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const command: string[] = [];
  const flags: Record<string, string | boolean | string[]> = {};
  const unknownFlags: UnknownFlag[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
      continue;
    }

    if (arg === "--") {
      command.push(...argv.slice(index + 1));
      break;
    }

    if (!arg.startsWith("-") || arg === "-") {
      command.push(arg);
      continue;
    }

    const parsed = parseFlagToken(arg);
    const name = aliases[parsed.name] ?? parsed.name;

    if (booleanFlags.has(name)) {
      setFlag(flags, name, parsed.value ?? true);
      continue;
    }

    if (valueFlags.has(name)) {
      const value = parsed.value ?? argv[index + 1];
      if (value === undefined) {
        throw new Error(`Missing value for --${name}`);
      }
      if (parsed.value === undefined) {
        index += 1;
      }
      setFlag(flags, name, value);
      continue;
    }

    const value = parsed.value ?? nextFlagValue(argv[index + 1]);
    if (parsed.value === undefined && value !== true) {
      index += 1;
    }
    unknownFlags.push({ name, value });
  }

  return { command, flags, unknownFlags };
}

export function getGlobalOptions(parsed: ParsedArgs): GlobalOptions {
  return {
    profile: getString(parsed.flags, "profile"),
    accountToken: getString(parsed.flags, "account-token"),
    serverToken: getString(parsed.flags, "server-token"),
    auth: getString(parsed.flags, "auth") as GlobalOptions["auth"],
    baseUrl: getString(parsed.flags, "base-url"),
    body: getString(parsed.flags, "body") ?? getString(parsed.flags, "data"),
    set: getStringArray(parsed.flags, "set"),
    query: getStringArray(parsed.flags, "query"),
    yes: getBoolean(parsed.flags, "yes") || getBoolean(parsed.flags, "force"),
    dryRun: getBoolean(parsed.flags, "dry-run"),
    json: getBoolean(parsed.flags, "json"),
    help: getBoolean(parsed.flags, "help"),
    version: getBoolean(parsed.flags, "version"),
    server: getString(parsed.flags, "server"),
    messageStream: getString(parsed.flags, "message-stream"),
  };
}

export function getString(flags: Record<string, string | boolean | string[]>, name: string): string | undefined {
  const value = flags[name];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const last = value.at(-1);
    return typeof last === "string" ? last : undefined;
  }
  return undefined;
}

export function getBoolean(flags: Record<string, string | boolean | string[]>, name: string): boolean {
  const value = flags[name];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value !== "false" && value !== "0";
  }
  return false;
}

export function getStringArray(flags: Record<string, string | boolean | string[]>, name: string): string[] {
  const value = flags[name];
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function parseFlagToken(arg: string): { name: string; value?: string } {
  const trimmed = arg.replace(/^-+/, "");
  const separator = trimmed.indexOf("=");
  if (separator === -1) {
    return { name: trimmed };
  }

  return {
    name: trimmed.slice(0, separator),
    value: trimmed.slice(separator + 1),
  };
}

function nextFlagValue(value: string | undefined): string | boolean {
  if (value === undefined || value.startsWith("-")) {
    return true;
  }

  return value;
}

function setFlag(flags: Record<string, string | boolean | string[]>, name: string, value: string | boolean): void {
  if (name === "set" || name === "query") {
    const current = flags[name];
    if (Array.isArray(current)) {
      current.push(String(value));
      return;
    }
    flags[name] = [String(value)];
    return;
  }

  flags[name] = value;
}
