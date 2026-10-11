import { CliError } from "./errors.js";
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import type { Profile } from "./types.js";
import { redact, setPath } from "./values.js";

export interface AppConfig {
  readonly activeProfile?: string;
  readonly baseUrl?: string;
  readonly [key: string]: unknown;
}

export function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && isAbsolute(xdg) ? xdg : join(homedir(), ".config");
  return join(base, "postmark");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export function profilesDir(): string {
  return join(configDir(), "profiles");
}

export function profilePath(name: string): string {
  assertProfileName(name);
  return join(profilesDir(), `${name}.json`);
}

export function readConfig(): AppConfig {
  const path = configPath();
  if (!existsSync(path)) {
    return {};
  }

  const value = readJsonFile<AppConfig>(path);
  try {
    for (const [key, field] of Object.entries(value)) {
      assertConfigKey(key);
      if (typeof field !== "string" || !field) throw new CliError("Configuration values must be nonempty strings");
      if (key === "baseUrl") checkUrl(field);
    }
  } catch { throw new CliError("Invalid saved configuration at " + path, "CONFIGURATION_ERROR", 3); }
  return value;
}

export function writeConfig(config: AppConfig): void {
  writeSecureJson(configPath(), config);
}

export function getActiveProfileName(): string | undefined {
  return readConfig().activeProfile;
}

export function setActiveProfileName(name: string): void {
  assertProfileName(name);
  const config = readConfig();
  writeConfig({ ...config, activeProfile: name });
}

export function listProfiles(): string[] {
  const dir = profilesDir();
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -5))
    .sort();
}

export function readProfile(name: string | undefined): Profile | undefined {
  if (!name) {
    return undefined;
  }

  const path = profilePath(name);
  if (!existsSync(path)) {
    return undefined;
  }

  const profile = readJsonFile<Profile>(path);
  try { validateProfile(profile); } catch { throw new CliError("Invalid saved profile " + name, "CONFIGURATION_ERROR", 3); }
  return profile;
}

export function requireProfile(name: string): Profile {
  const profile = readProfile(name);
  if (!profile) {
    throw new CliError(`Profile "${name}" does not exist`, "NOT_FOUND", 5);
  }
  return profile;
}

export function writeProfile(name: string, profile: Profile): void {
  validateProfile(profile);
  writeSecureJson(profilePath(name), profile);
}

export function deleteProfile(name: string): void {
  const path = profilePath(name);
  if (!existsSync(path)) {
    throw new CliError(`Profile "${name}" does not exist`, "NOT_FOUND", 5);
  }
  if (getActiveProfileName() === name) throw new CliError("Select another profile or unset activeProfile before deleting the active profile", "CONFLICT", 6);
  rmSync(path);
}

export function showProfile(name: string, options: { showSecrets?: boolean } = {}): unknown {
  const profile = requireProfile(name);
  return options.showSecrets ? profile : redact(profile);
}

export function configGet(path: string): unknown {
  assertConfigKey(path);
  const parts = path.split(".").filter(Boolean);
  let current: unknown = readConfig();
  for (const part of parts) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function configSet(path: string, value: unknown): AppConfig {
  assertConfigKey(path);
  if (typeof value !== "string" || !value) throw new CliError("Configuration values must be nonempty strings");
  if (path === "activeProfile") requireProfile(value);
  if (path === "baseUrl") checkUrl(value);
  const config = { ...readConfig() };
  setPath(config, path, value);
  writeConfig(config);
  return config;
}

export function configUnset(path: string): AppConfig {
  assertConfigKey(path);
  const config = { ...readConfig() };
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) {
    throw new CliError("Config key cannot be empty");
  }

  let cursor: Record<string, unknown> = config;
  for (const part of parts.slice(0, -1)) {
    const next = cursor[part];
    if (typeof next !== "object" || next === null || Array.isArray(next)) {
      writeConfig(config);
      return config;
    }
    cursor = next as Record<string, unknown>;
  }
  delete cursor[parts.at(-1) as string];
  writeConfig(config);
  return config;
}

export function resolveProfileName(explicitProfile: string | undefined): string | undefined {
  return explicitProfile ?? process.env.POSTMARK_PROFILE ?? getActiveProfileName();
}

function writeSecureJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  chmodSync(configDir(), 0o700);
  chmodSync(dirname(path), 0o700);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function readJsonFile<T>(path: string): T {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("object required");
    return value as T;
  } catch { throw new CliError("Cannot read configuration object at " + path, "CONFIGURATION_ERROR", 3); }
}

function assertProfileName(name: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new CliError("Profile names may only contain letters, numbers, dots, underscores, and hyphens");
  }
}

function assertConfigKey(key: string): void {
  if (!["activeProfile", "baseUrl"].includes(key)) throw new CliError("Unknown configuration key " + JSON.stringify(key) + "; use activeProfile or baseUrl");
}

function checkUrl(value: string): void {
  let url: URL;
  try { url = new URL(value); } catch { throw new CliError("baseUrl must be an absolute HTTP(S) URL"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new CliError("baseUrl must use HTTP(S) without credentials, query, or fragment");
}
function validateProfile(value: Profile): void {
  const names = new Set(["accountToken", "serverToken", "baseUrl", "defaultServerId", "defaultMessageStream"]);
  if (Object.keys(value).length === 0) throw new CliError("Profile must contain at least one field");
  for (const [key, field] of Object.entries(value)) if (!names.has(key) || typeof field !== "string" || !field) throw new CliError("Profile fields must be recognized nonempty strings");
  if (value.baseUrl) checkUrl(value.baseUrl);
}
