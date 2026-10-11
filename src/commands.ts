import type { Endpoint } from "./types.js";

export const globalFlags = ["profile", "format", "color", "quiet", "verbose", "no-input", "timeout", "help", "version"];
export const authFlags = ["account-token", "server-token", "base-url"];
export const utilityCommands: Record<string, { usage: string; description: string; flags: string[] }> = {
  setup: { usage: "setup [profile]", description: "Create and activate a local profile; existing profiles require profiles update.", flags: [...authFlags, "default-server-id", "default-message-stream", "from-env"] },
  "profiles list": { usage: "profiles list", description: "List local profiles.", flags: [] },
  "profiles get": { usage: "profiles get <name>", description: "Inspect a profile with tokens redacted.", flags: [] },
  "profiles create": { usage: "profiles create <name>", description: "Create a local profile.", flags: [...authFlags, "default-server-id", "default-message-stream"] },
  "profiles update": { usage: "profiles update <name>", description: "Change supplied local profile fields.", flags: [...authFlags, "default-server-id", "default-message-stream"] },
  "profiles delete": { usage: "profiles delete <name>", description: "Delete an inactive local profile.", flags: [] },
  "profiles use": { usage: "profiles use <name>", description: "Select an existing profile.", flags: [] },
  "config list": { usage: "config list", description: "Read local configuration.", flags: [] },
  "config path": { usage: "config path", description: "Show local configuration paths.", flags: [] },
  "config get": { usage: "config get <key>", description: "Read activeProfile or baseUrl.", flags: [] },
  "config set": { usage: "config set <key> <value>", description: "Set activeProfile or baseUrl.", flags: [] },
  "config unset": { usage: "config unset <key>", description: "Clear activeProfile or baseUrl.", flags: [] },
  "auth verify": { usage: "auth verify [--auth account|server]", description: "Check access to account /servers or current /server; does not prove all permissions.", flags: [...authFlags, "auth"] },
  "api request": { usage: "api request <METHOD> <path>", description: "Send a raw same-origin request; GET, HEAD, OPTIONS, POST, PUT, PATCH, DELETE.", flags: [...authFlags, "auth", "query", "file", "yes", "dry-run"] },
  "bounces types list": { usage: "bounces types list", description: "List documented bounce type names locally.", flags: [] },
  "bounces rebound-snippet get": { usage: "bounces rebound-snippet get", description: "Return the rebound snippet documentation URL.", flags: [] },
  "completions bash": { usage: "completions bash", description: "Print Bash completion code; does not edit shell files.", flags: [] },
  "completions zsh": { usage: "completions zsh", description: "Print Zsh completion code; does not edit shell files.", flags: [] },
  "completions fish": { usage: "completions fish", description: "Print Fish completion code; does not edit shell files.", flags: [] },
};
export function endpointFlags(endpoint: Endpoint): string[] {
  return [
    (endpoint.auth === "account" ? "account-token" : "server-token"), "base-url",
    ...(endpoint.method === "GET" ? ["query"] : endpoint.method === "DELETE" ? [] : ["file", "set"]),
    ...(endpoint.pagination ? ["all", "cursor", "page-size", "max-items"] : []),
    ...(endpoint.mutation ? ["yes", "dry-run"] : endpoint.method === "POST" ? ["dry-run"] : []),
    ...(endpoint.name.startsWith("suppressions ") ? ["message-stream"] : []),
    ...(endpoint.name.startsWith("stats outbound ") ? ["metric"] : []),
  ];
}
export function canonicalUsage(endpoint: Endpoint): string {
  if (endpoint.name.startsWith("stats outbound ")) return "stats outbound get --metric " + endpoint.pattern[2];
  return endpoint.pattern.map(part => part.startsWith(":") ? "<" + part.slice(1) + ">" : part).join(" ") + (endpoint.name.startsWith("suppressions ") ? " --message-stream <stream-id>" : "");
}
export const optionHelp: Record<string, string> = {
  profile: "NAME; selected profile, otherwise POSTMARK_PROFILE or active profile",
  format: "json|pretty|human; default compact uncolored json",
  color: "auto|always|never; default auto, presentation formats only",
  quiet: "-q; suppress notices, preserve results and errors",
  verbose: "-v; redacted request diagnostics on stderr",
  "no-input": "Never prompt; also enforced for CI and nonterminal stdin",
  timeout: "DURATION; default 30s, positive ms/s/m, maximum 2147483647ms",
  help: "-h; local help without authentication or network",
  version: "Print executable name and version; no short alias",
  "account-token": "TOKEN; prefer POSTMARK_ACCOUNT_TOKEN",
  "server-token": "TOKEN; prefer POSTMARK_SERVER_TOKEN",
  "base-url": "URL; default https://api.postmarkapp.com; HTTP(S), no embedded credentials",
  auth: "account|server; required token class for raw requests or auth verification",
  file: "PATH; complete JSON input; - reads stdin; cannot mix with --set",
  set: "PATH=VALUE; repeatable provider fields, JSON scalar/object/array or literal text",
  query: "NAME=VALUE; repeatable literal provider query parameters; count/offset use pagination flags",
  "message-stream": "ID; suppression scope; falls back to profile defaultMessageStream",
  "default-server-id": "ID; saved provider server reference",
  "default-message-stream": "ID; saved default suppression scope",
  "from-env": "Read setup tokens from POSTMARK_ACCOUNT_TOKEN/POSTMARK_SERVER_TOKEN",
  metric: "overview|sends|bounces|spam|tracked|opens|open-platforms|open-clients|clicks|click-browser-families|click-platforms|click-location",
  yes: "-y; supply mutation confirmation",
  "dry-run": "Local validation and redacted plan; no network or writes",
  all: "Follow collection pages; default one page",
  cursor: "OFFSET; nonnegative integer continuation from meta.next_cursor; default 0",
  "page-size": "N; integer 1..500; default 100",
  "max-items": "N; positive total traversal bound; requires --all",
};
