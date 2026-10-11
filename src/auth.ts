import { CliError } from "./errors.js";
import { readConfig, readProfile, resolveProfileName } from "./config.js";
import type { AuthKind, GlobalOptions, Profile, ResolvedAuth } from "./types.js";

export interface RuntimeContext {
  readonly profileName?: string;
  readonly profile?: Profile;
  readonly baseUrl: string;
}

export function loadRuntimeContext(options: GlobalOptions): RuntimeContext {
  const profileName = resolveProfileName(options.profile);
  const profile = readProfile(profileName);
  if (profileName && !profile) throw new CliError("Profile " + JSON.stringify(profileName) + " does not exist", "CONFIGURATION_ERROR", 3);
  const config = readConfig();

  return {
    profileName,
    profile,
    baseUrl: validateBaseUrl(options.baseUrl ?? process.env.POSTMARK_BASE_URL ?? profile?.baseUrl ?? config.baseUrl ?? "https://api.postmarkapp.com"),
  };
}

export function resolveAuth(required: AuthKind, options: GlobalOptions, context: RuntimeContext): ResolvedAuth {
  const requested = options.auth ?? required;

  if (requested === "none") {
    return { kind: "none" };
  }

  if (requested === "either") {
    const account = resolveAccountToken(options, context);
    if (account.token) {
      return account;
    }
    const server = resolveServerToken(options, context);
    if (server.token) {
      return server;
    }
    return { kind: "either" };
  }

  if (requested === "account") {
    return resolveAccountToken(options, context);
  }

  return resolveServerToken(options, context);
}

export function requireToken(auth: ResolvedAuth, commandName: string): string {
  if (auth.token) {
    return auth.token;
  }

  const expected =
    auth.kind === "account"
      ? "account token"
      : auth.kind === "server"
        ? "server token"
        : "account or server token";

  throw new CliError(
    `Missing ${expected} for "${commandName}". Use --account-token/--server-token, POSTMARK_ACCOUNT_TOKEN/POSTMARK_SERVER_TOKEN, or run postmark setup.`, "AUTHENTICATION_REQUIRED", 3,
  );
}

function resolveAccountToken(options: GlobalOptions, context: RuntimeContext): ResolvedAuth {
  if (options.accountToken) {
    return { kind: "account", token: options.accountToken, source: "--account-token" };
  }
  if (process.env.POSTMARK_ACCOUNT_TOKEN) {
    return { kind: "account", token: process.env.POSTMARK_ACCOUNT_TOKEN, source: "POSTMARK_ACCOUNT_TOKEN" };
  }
  if (context.profile?.accountToken) {
    return { kind: "account", token: context.profile.accountToken, source: `profile:${context.profileName}` };
  }
  return { kind: "account" };
}

function resolveServerToken(options: GlobalOptions, context: RuntimeContext): ResolvedAuth {
  if (options.serverToken) {
    return { kind: "server", token: options.serverToken, source: "--server-token" };
  }
  if (process.env.POSTMARK_SERVER_TOKEN) {
    return { kind: "server", token: process.env.POSTMARK_SERVER_TOKEN, source: "POSTMARK_SERVER_TOKEN" };
  }
  if (context.profile?.serverToken) {
    return { kind: "server", token: context.profile.serverToken, source: `profile:${context.profileName}` };
  }
  return { kind: "server" };
}

export function validateBaseUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new CliError("Base URL must be an absolute HTTP or HTTPS URL", "CONFIGURATION_ERROR", 3); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new CliError("Base URL must use HTTP or HTTPS without credentials, query, or fragment", "CONFIGURATION_ERROR", 3);
  return url.toString();
}
