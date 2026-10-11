import { CliError, statusFailure } from "./errors.js";
import { resolveAuth, requireToken, type RuntimeContext } from "./auth.js";
import type { Endpoint, GlobalOptions, HttpMethod, QueryEntry, RequestPlan, ResolvedAuth } from "./types.js";
import { assignmentsToQuery, redact } from "./values.js";

export class PostmarkApiError extends CliError {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly apiMessage: string,
    readonly providerCode?: string | number,
    readonly requestId?: string,
  ) {
    super("Postmark API returned " + status + " " + statusText + ": " + apiMessage, statusFailure(status).code, statusFailure(status).exitCode, { status, provider_code: providerCode, request_id: requestId, retryable: statusFailure(status).retryable });
    this.name = "PostmarkApiError";
  }
}

export interface BuildRequestOptions {
  readonly endpoint: Endpoint;
  readonly params: Record<string, string>;
  readonly options: GlobalOptions;
  readonly context: RuntimeContext;
  readonly query: readonly QueryEntry[];
  readonly body?: unknown;
}

export async function executeRequest(plan: RequestPlan): Promise<unknown> {
  let response: Response;
  try { response = await fetch(plan.url, {
    method: plan.method,
    headers: plan.headers,
    body: plan.body === undefined ? undefined : JSON.stringify(plan.body),
    signal: AbortSignal.timeout(plan.timeoutMs),
    redirect: "error",
  }); } catch { throw new CliError("Postmark request failed or timed out. A mutation may have completed; verify its state before retrying.", "TRANSIENT_FAILURE", 7, { retryable: ["GET", "HEAD", "OPTIONS"].includes(plan.method), outcome_unknown: !["GET", "HEAD", "OPTIONS"].includes(plan.method) }); }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("json") && !contentType.startsWith("text/")) throw new CliError("Binary response is not supported", "UNSUPPORTED_RESPONSE", 1);
  let text: string;
  try { text = await response.text(); } catch { throw new CliError("Response transfer failed; a mutation may have completed", "TRANSIENT_FAILURE", 7, { retryable: ["GET", "HEAD", "OPTIONS"].includes(plan.method), outcome_unknown: !["GET", "HEAD", "OPTIONS"].includes(plan.method) }); }
  let payload: unknown = text;
  if (contentType.includes("json") && text) {
    try { payload = JSON.parse(text); } catch { throw new CliError("Postmark returned invalid JSON", "INVALID_RESPONSE", 1, { status: response.status }); }
  }

  if (!response.ok) {
    const record = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
    throw new PostmarkApiError(
      response.status,
      response.statusText,
      typeof record.Message === "string" ? record.Message : formatPayload(payload),
      typeof record.ErrorCode === "string" || typeof record.ErrorCode === "number" ? record.ErrorCode : undefined,
      response.headers.get("x-postmark-request-id") ?? response.headers.get("x-request-id") ?? undefined,
    );
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
  const url = buildUrl(input.context.baseUrl, path, [
    ...input.query,
    ...assignmentsToQuery(input.options.query),
  ]);
  const headers = buildHeaders(auth, token, input.body);

  return {
    method: input.endpoint.method,
    url,
    auth,
    headers,
    body: input.body,
    timeoutMs: input.options.timeoutMs,
  };
}

export function buildApiRequestPlan(input: {
  readonly method: HttpMethod;
  readonly path: string;
  readonly options: GlobalOptions;
  readonly context: RuntimeContext;
  readonly query: readonly QueryEntry[];
  readonly body?: unknown;
}): RequestPlan {
  const auth = resolveAuth(input.options.auth ?? "either", input.options, input.context);
  const token = requireToken(auth, "api request");
  const url = buildUrl(input.context.baseUrl, normalizePath(input.path), [
    ...input.query,
    ...assignmentsToQuery(input.options.query),
  ]);

  return {
    method: input.method,
    url,
    auth,
    headers: buildHeaders(auth, token, input.body),
    body: input.body,
    timeoutMs: input.options.timeoutMs,
  };
}

export function renderDryRun(plan: RequestPlan): unknown {
  return {
    method: plan.method,
    url: redactedUrl(plan.url),
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

function buildUrl(baseUrl: string, path: string, query: readonly QueryEntry[]): string {
  const url = new URL(normalizePath(path), ensureTrailingSlash(baseUrl));
  if (url.origin !== new URL(baseUrl).origin || url.username || url.password || url.hash) throw new CliError("API path must stay on the selected base URL origin without credentials or fragment");
  for (const [key, value] of query) {
    url.searchParams.append(key, value);
  }
  return url.toString();
}

function fillPath(path: string, params: Record<string, string | undefined>): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params[key];
    if (!value) {
      throw new CliError(`Missing path parameter "${key}"`);
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

export function redactedUrl(value: string): string {
  const url = new URL(value);
  for (const key of new Set(url.searchParams.keys())) if (/token|secret|password|authorization|key/i.test(key)) url.searchParams.set(key, "[redacted]");
  return url.toString();
}
