import { CliError } from "./errors.js";
import { readFileSync } from "node:fs";
import type { QueryEntry } from "./types.js";

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
    try { return JSON.parse(value); } catch { throw new CliError("Invalid JSON field value"); }
  }

  return input;
}

export function readJsonBody(source: string | undefined): Record<string, unknown> | unknown[] | undefined {
  if (!source) {
    return undefined;
  }

  let parsed: unknown;
  try { const raw = source === "-" ? readFileSync(0, "utf8") : readFileSync(source, "utf8"); parsed = JSON.parse(raw); }
  catch { throw new CliError("--file must name a readable file containing valid JSON"); }

  if (!isObject(parsed) && !Array.isArray(parsed)) {
    throw new CliError("--file must contain a JSON object or array");
  }

  return parsed as Record<string, unknown> | unknown[];
}

export function applyAssignments(target: Record<string, unknown>, assignments: readonly string[]): void {
  for (const assignment of assignments) {
    const [key, ...rest] = assignment.split("=");
    if (!key || rest.length === 0) {
      throw new CliError(`Invalid assignment "${assignment}". Use Key=value.`);
    }
    setPath(target, key, parseValue(rest.join("=")));
  }
}

export function assignmentsToQuery(assignments: readonly string[]): QueryEntry[] {
  return assignments.map((assignment) => {
    const [key, ...rest] = assignment.split("=");
    if (!key || rest.length === 0) throw new CliError("Invalid query " + JSON.stringify(assignment) + ". Use Key=value.");
    return [key, rest.join("=")] as const;
  });
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


export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  if (parts.some(part => !part || ["__proto__", "constructor", "prototype"].includes(part))) throw new CliError("Invalid assignment path");
  if (parts.length === 0) throw new CliError("Assignment path cannot be empty");
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    const current = cursor[part];
    if (!isObject(current)) cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts.at(-1) as string] = value;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
