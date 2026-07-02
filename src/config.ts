import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Profile } from "./types.js";
import { redact, setPath } from "./values.js";

export interface AppConfig {
  readonly activeProfile?: string;
  readonly baseUrl?: string;
  readonly [key: string]: unknown;
}

export function configDir(): string {
  const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
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

  return readJsonFile<AppConfig>(path);
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

  return readJsonFile<Profile>(path);
}

export function requireProfile(name: string): Profile {
  const profile = readProfile(name);
  if (!profile) {
    throw new Error(`Profile "${name}" does not exist`);
  }
  return profile;
}

export function writeProfile(name: string, profile: Profile): void {
  writeSecureJson(profilePath(name), profile);
}

export function deleteProfile(name: string): void {
  const path = profilePath(name);
  if (!existsSync(path)) {
    throw new Error(`Profile "${name}" does not exist`);
  }
  rmSync(path);
}

export function showProfile(name: string, options: { showSecrets?: boolean } = {}): unknown {
  const profile = requireProfile(name);
  return options.showSecrets ? profile : redact(profile);
}

export function configGet(path: string): unknown {
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
  const config = { ...readConfig() };
  setPath(config, path, value);
  writeConfig(config);
  return config;
}

export function configUnset(path: string): AppConfig {
  const config = { ...readConfig() };
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Config key cannot be empty");
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
  return explicitProfile ?? getActiveProfileName();
}

function writeSecureJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function readJsonFile<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

function assertProfileName(name: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new Error("Profile names may only contain letters, numbers, dots, underscores, and hyphens");
  }
}
