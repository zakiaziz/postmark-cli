import { CliError } from "./errors.js";
import type { AuthKind, ColorMode, GlobalOptions, OutputFormat, ParsedArgs, UnknownFlag } from "./types.js";

const valueFlags = new Set([
  "profile", "account-token", "server-token", "auth", "base-url", "file",
  "set", "query", "server", "message-stream", "default-server-id",
  "default-message-stream", "format", "color", "timeout", "cursor",
  "page-size", "max-items", "metric",
]);
const booleanFlags = new Set([
  "yes", "dry-run", "help", "version", "from-env", "quiet", "verbose",
  "no-input", "all",
]);
const repeatableFlags = new Set(["set", "query"]);
const aliases: Record<string, string> = { h: "help", q: "quiet", v: "verbose", y: "yes" };

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const command: string[] = [];
  const flags: ParsedArgs["flags"] = {};
  const unknownFlags: UnknownFlag[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;
    if (arg === "--") { command.push(...argv.slice(index + 1)); break; }
    if (!arg.startsWith("-") || arg === "-") { command.push(arg); continue; }
    const parsed = parseFlagToken(arg);
    if (arg.startsWith("---") || (arg.startsWith("--") && parsed.name.length === 1) || (!arg.startsWith("--") && !(parsed.name in aliases))) throw new CliError("Unknown option " + arg);
    const name = arg.startsWith("--") ? parsed.name : aliases[parsed.name]!;
    if (booleanFlags.has(name)) {
      setFlag(flags, name, parseBoolean(name, parsed.value));
      continue;
    }
    if (valueFlags.has(name)) {
      const value = parsed.value ?? argv[index + 1];
      if (value === undefined || (parsed.value === undefined && value.startsWith("-") && value !== "-")) throw new CliError("Missing value for --" + name);
      if (value === "") throw new CliError("--" + name + " cannot be empty");
      if (parsed.value === undefined) index += 1;
      setFlag(flags, name, value);
      continue;
    }
    const value = parsed.value ?? nextFlagValue(argv[index + 1]);
    if (parsed.value === undefined && value !== true) index += 1;
    unknownFlags.push({ name, value });
  }
  return { command, flags, unknownFlags };
}

export function getGlobalOptions(parsed: ParsedArgs): GlobalOptions {
  return {
    profile: getString(parsed.flags, "profile"),
    accountToken: getString(parsed.flags, "account-token"),
    serverToken: getString(parsed.flags, "server-token"),
    auth: choice(parsed.flags, "auth", ["account", "server"]) as AuthKind | undefined,
    baseUrl: getString(parsed.flags, "base-url"),
    file: getString(parsed.flags, "file"),
    set: getStringArray(parsed.flags, "set"),
    query: getStringArray(parsed.flags, "query"),
    yes: getBoolean(parsed.flags, "yes"),
    dryRun: getBoolean(parsed.flags, "dry-run"),
    help: getBoolean(parsed.flags, "help"),
    version: getBoolean(parsed.flags, "version"),
    server: getString(parsed.flags, "server"),
    messageStream: getString(parsed.flags, "message-stream"),
    format: (choice(parsed.flags, "format", ["json", "pretty", "human"]) ?? "json") as OutputFormat,
    color: (choice(parsed.flags, "color", ["auto", "always", "never"]) ?? "auto") as ColorMode,
    quiet: getBoolean(parsed.flags, "quiet"),
    verbose: getBoolean(parsed.flags, "verbose"),
    noInput: getBoolean(parsed.flags, "no-input"),
    timeoutMs: duration(getString(parsed.flags, "timeout") ?? "30s"),
    all: getBoolean(parsed.flags, "all"),
    cursor: getString(parsed.flags, "cursor"),
    pageSize: positiveInteger(parsed.flags, "page-size"),
    maxItems: positiveInteger(parsed.flags, "max-items"),
    metric: getString(parsed.flags, "metric"),
  };
}
export function getString(flags: ParsedArgs["flags"], name: string): string | undefined {
  const value=flags[name]; return typeof value === "string" ? value : undefined;
}
export function getBoolean(flags: ParsedArgs["flags"], name: string): boolean { return flags[name] === true; }
export function getStringArray(flags: ParsedArgs["flags"], name: string): string[] {
  const value=flags[name]; return Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
}
function parseFlagToken(arg:string): {name:string;value?:string} {
  const value=arg.replace(/^-+/,""); const at=value.indexOf("=");
  return at<0 ? {name:value} : {name:value.slice(0,at),value:value.slice(at+1)};
}
function parseBoolean(name:string,value:string|undefined):boolean {
  if (value===undefined||value==="true") return true; if(value==="false") return false;
  throw new CliError("Invalid boolean value "+JSON.stringify(value)+" for --"+name+". Use true or false.");
}
function nextFlagValue(value:string|undefined):string|boolean { return value===undefined||value.startsWith("-") ? true:value; }
function setFlag(flags:ParsedArgs["flags"],name:string,value:string|boolean):void {
  if (!repeatableFlags.has(name)) { if(name in flags) throw new CliError("Duplicate option "+JSON.stringify("--"+name)); flags[name]=value; return; }
  const current=flags[name]; if(Array.isArray(current)) current.push(String(value)); else flags[name]=[String(value)];
}
function choice(flags:ParsedArgs["flags"],name:string,allowed:readonly string[]):string|undefined {
  const value=getString(flags,name); if(value===undefined)return undefined;
  if(!allowed.includes(value))throw new CliError("Invalid --"+name+" value "+JSON.stringify(value)+". Use "+allowed.join(", ")+"."); return value;
}
function positiveInteger(flags:ParsedArgs["flags"],name:string):number|undefined {
  const value=getString(flags,name); if(value===undefined)return undefined;
  if(!/^[1-9][0-9]*$/.test(value)||!Number.isSafeInteger(Number(value)))throw new CliError("--"+name+" must be a positive integer; received "+JSON.stringify(value)+"."); return Number(value);
}
function duration(value:string):number {
  const match=/^([1-9][0-9]*)(ms|s|m)$/.exec(value); if(!match)throw new CliError("--timeout must be a positive duration with ms, s, or m.");
  const result=Number(match[1])*(match[2]==="m"?60000:match[2]==="s"?1000:1);
  if(!Number.isSafeInteger(result)||result>2_147_483_647)throw new CliError("--timeout is outside the supported range."); return result;
}
