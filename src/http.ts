import { resolveAuth, requireToken, type RuntimeContext } from "./auth.js";
import type { Endpoint, GlobalOptions, HttpMethod, RequestPlan, ResolvedAuth } from "./types.js";
import { assignmentsToQuery, redact } from "./values.js";

export interface BuildRequestOptions {
  readonly endpoint: Endpoint;
  readonly params: Record<string, string>;
  readonly options: GlobalOptions;
  readonly context: RuntimeContext;
  readonly query: Record<string, string>;
  readonly body?: unknown;
}

export async function executeRequest(plan: RequestPlan): Promise<unknown> {
  const response = await fetch(plan.url, {
    method: plan.method,
    headers: plan.headers,
    body: plan.body === undefined ? undefined : JSON.stringify(plan.body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  const payload = contentType.includes("application/json") && text ? (JSON.parse(text) as unknown) : text;

  if (!response.ok) {
    throw new Error(`Postmark API returned ${response.status} ${response.statusText}: ${formatPayload(payload)}`);
  }

  return payload === "" ? null : payload;
}

export function buildRequestPlan(input: BuildRequestOptions): RequestPlan {
  const auth = resolveAuth(input.endpoint.auth, input.options, input.context);
  const token = requireToken(auth, input.endpoint.name);
  const pathParams = { ...input.params };
  pathParams.serverId = pathParams.serverId ?? input.options.server ?? input.context.profile?.defaultServerId;
  pathParams.streamId = pathParams.streamId ?? input.options.messageStream ?? input.context.profile?.defaultMessageStream;
  const path = fillPath(input.endpoint.path, pathParams);
  const url = buildUrl(input.context.baseUrl, path, {
    ...input.query,
    ...assignmentsToQuery(input.options.query),
  });
  const headers = buildHeaders(auth, token, input.body);

  return {
    method: input.endpoint.method,
    url,
    auth,
    headers,
    body: input.body,
  };
}

export function buildApiRequestPlan(input: {
  readonly method: HttpMethod;
  readonly path: string;
  readonly options: GlobalOptions;
  readonly context: RuntimeContext;
  readonly query: Record<string, string>;
  readonly body?: unknown;
}): RequestPlan {
  const auth = resolveAuth(input.options.auth ?? "either", input.options, input.context);
  const token = requireToken(auth, "api request");
  const url = buildUrl(input.context.baseUrl, normalizePath(input.path), {
    ...input.query,
    ...assignmentsToQuery(input.options.query),
  });

  return {
    method: input.method,
    url,
    auth,
    headers: buildHeaders(auth, token, input.body),
    body: input.body,
  };
}

export function renderDryRun(plan: RequestPlan): unknown {
  return {
    method: plan.method,
    url: plan.url,
    auth: {
      kind: plan.auth.kind,
      source: plan.auth.source,
    },
    headers: redact(plan.headers),
    body: redact(plan.body),
  };
}

function buildHeaders(auth: ResolvedAuth, token: string, body: unknown): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (auth.kind === "account") {
    headers["X-Postmark-Account-Token"] = token;
  } else if (auth.kind === "server") {
    headers["X-Postmark-Server-Token"] = token;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function buildUrl(baseUrl: string, path: string, query: Record<string, string>): string {
  const url = new URL(normalizePath(path), ensureTrailingSlash(baseUrl));
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function fillPath(path: string, params: Record<string, string | undefined>): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params[key];
    if (!value) {
      throw new Error(`Missing path parameter "${key}"`);
    }
    return encodeURIComponent(value);
  });
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function formatPayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }
  return JSON.stringify(payload);
}
