export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type AuthKind = "server" | "account" | "either" | "none";
export type OutputFormat = "json" | "pretty" | "human";
export type ColorMode = "auto" | "always" | "never";

export interface Endpoint {
  readonly name: string;
  readonly pattern: readonly string[];
  readonly method: HttpMethod;
  readonly path: string;
  readonly auth: AuthKind;
  readonly description: string;
  readonly mutation?: boolean;
  readonly docs?: string;
  readonly collectionKey?: string;
  readonly pagination?: { maxPageSize: number; defaultPageSize: number; maxOffset?: number };
}
export interface UnknownFlag { readonly name: string; readonly value: string | boolean; }
export interface ParsedArgs {
  readonly command: string[];
  readonly flags: Record<string, string | boolean | string[]>;
  readonly unknownFlags: UnknownFlag[];
}
export interface Profile {
  readonly accountToken?: string;
  readonly serverToken?: string;
  readonly defaultServerId?: string;
  readonly defaultMessageStream?: string;
  readonly baseUrl?: string;
}
export interface GlobalOptions {
  readonly profile?: string;
  readonly accountToken?: string;
  readonly serverToken?: string;
  readonly auth?: AuthKind;
  readonly baseUrl?: string;
  readonly file?: string;
  readonly set: string[];
  readonly query: string[];
  readonly yes: boolean;
  readonly dryRun: boolean;
  readonly help: boolean;
  readonly version: boolean;
  readonly server?: string;
  readonly messageStream?: string;
  readonly format: OutputFormat;
  readonly color: ColorMode;
  readonly quiet: boolean;
  readonly verbose: boolean;
  readonly noInput: boolean;
  readonly timeoutMs: number;
  readonly all: boolean;
  readonly cursor?: string;
  readonly pageSize?: number;
  readonly maxItems?: number;
  readonly metric?: string;
}
export type QueryEntry = readonly [name: string, value: string];
export interface ResolvedAuth { readonly kind: AuthKind; readonly token?: string; readonly source?: string; }
export interface RequestPlan {
  readonly method: HttpMethod;
  readonly url: string;
  readonly auth: ResolvedAuth;
  readonly headers: Record<string, string>;
  readonly body?: unknown;
  readonly timeoutMs: number;
}
