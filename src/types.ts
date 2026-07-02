export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type AuthKind = "server" | "account" | "either" | "none";

export interface Endpoint {
  readonly name: string;
  readonly pattern: readonly string[];
  readonly method: HttpMethod;
  readonly path: string;
  readonly auth: AuthKind;
  readonly description: string;
  readonly mutation?: boolean;
  readonly docs?: string;
}

export interface UnknownFlag {
  readonly name: string;
  readonly value: string | boolean;
}

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
  readonly body?: string;
  readonly set: string[];
  readonly query: string[];
  readonly yes: boolean;
  readonly dryRun: boolean;
  readonly json: boolean;
  readonly help: boolean;
  readonly version: boolean;
  readonly server?: string;
  readonly messageStream?: string;
}

export interface ResolvedAuth {
  readonly kind: AuthKind;
  readonly token?: string;
  readonly source?: string;
}

export interface RequestPlan {
  readonly method: HttpMethod;
  readonly url: string;
  readonly auth: ResolvedAuth;
  readonly headers: Record<string, string>;
  readonly body?: unknown;
}
