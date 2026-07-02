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
  const config = readConfig();

  return {
    profileName,
    profile,
    baseUrl: options.baseUrl ?? profile?.baseUrl ?? config.baseUrl ?? "https://api.postmarkapp.com",
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

  throw new Error(
    `Missing ${expected} for "${commandName}". Use --account-token/--server-token, POSTMARK_ACCOUNT_TOKEN/POSTMARK_SERVER_TOKEN, or run postmark setup.`,
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
