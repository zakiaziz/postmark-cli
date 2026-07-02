import { readFileSync } from "node:fs";
import type { UnknownFlag } from "./types.js";

export function parseValue(input: string | boolean): unknown {
  if (typeof input === "boolean") {
    return input;
  }

  const value = input.trim();

  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  if ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]"))) {
    return JSON.parse(value);
  }

  return input;
}

export function readJsonBody(source: string | undefined): Record<string, unknown> | unknown[] | undefined {
  if (!source) {
    return undefined;
  }

  const raw = source.startsWith("@") ? readFileSync(source.slice(1), "utf8") : source;
  const parsed = JSON.parse(raw) as unknown;

  if (!isObject(parsed) && !Array.isArray(parsed)) {
    throw new Error("Body must be a JSON object or array");
  }

  return parsed as Record<string, unknown> | unknown[];
}

export function applyAssignments(target: Record<string, unknown>, assignments: readonly string[]): void {
  for (const assignment of assignments) {
    const [key, ...rest] = assignment.split("=");
    if (!key || rest.length === 0) {
      throw new Error(`Invalid assignment "${assignment}". Use Key=value.`);
    }
    setPath(target, key, parseValue(rest.join("=")));
  }
}

export function unknownFlagsToBody(flags: readonly UnknownFlag[]): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const flag of flags) {
    setPath(body, kebabToPascal(flag.name), parseValue(flag.value));
  }
  return body;
}

export function unknownFlagsToQuery(flags: readonly UnknownFlag[]): Record<string, string> {
  const query: Record<string, string> = {};
  for (const flag of flags) {
    query[kebabToCamel(flag.name)] = String(parseValue(flag.value));
  }
  return query;
}

export function assignmentsToQuery(assignments: readonly string[]): Record<string, string> {
  const query: Record<string, string> = {};
  for (const assignment of assignments) {
    const [key, ...rest] = assignment.split("=");
    if (!key || rest.length === 0) {
      throw new Error(`Invalid query "${assignment}". Use Key=value.`);
    }
    query[key] = String(parseValue(rest.join("=")));
  }
  return query;
}

export function mergeBody(base: Record<string, unknown> | unknown[] | undefined, extra: Record<string, unknown>): unknown {
  if (Array.isArray(base)) {
    if (Object.keys(extra).length > 0) {
      throw new Error("Cannot merge --set or flag fields into an array body");
    }
    return base;
  }

  return { ...(base ?? {}), ...extra };
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (!isObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (/token|secret|password|authorization/i.test(key)) {
      result[key] = "[redacted]";
    } else {
      result[key] = redact(child);
    }
  }
  return result;
}

export function kebabToPascal(input: string): string {
  return input
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function kebabToCamel(input: string): string {
  const pascal = kebabToPascal(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Assignment path cannot be empty");
  }

  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    const current = cursor[part];
    if (!isObject(current)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }

  cursor[parts.at(-1) as string] = value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
