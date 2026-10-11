import { CliError } from "./core/errors.js";
import type { PageInfo, PageRequest, Provider, ProviderErrorDetail } from "./core/provider.js";
import { HTTP_METHODS } from "./core/types.js";
import { isRecord, visibleAsciiConstraint } from "./core/values.js";
import { commands, groups, parseOffset } from "./registry.js";

export const provider: Provider = {
  bin: "postmark",
  name: "Postmark",
  secrets: [
    { key: "accountToken", label: "account token", validate: visibleAsciiConstraint },
    { key: "serverToken", label: "server token", validate: visibleAsciiConstraint },
  ],
  authScheme: "the X-Postmark-Account-Token and X-Postmark-Server-Token headers",
  authorize: (credential) => ({
    "X-Postmark-Account-Token": credential.accountToken ?? "",
    "X-Postmark-Server-Token": credential.serverToken ?? "",
  }),
  baseUrl: { default: "https://api.postmarkapp.com", allowPath: false },
  requestIdHeader: "x-postmark-request-id",
  errorDetail,
  pagination: {
    apply({ query }, page) {
      query.set("count", String(page.size));
      query.set("offset", String(page.cursor === null ? 0 : parseOffset(page.cursor)));
    },
    read: readPage,
  },
  verify: {
    method: "GET",
    path: "/server",
    query: [],
    effect:
      "Sends GET /server. Success proves that Postmark accepted the server token for that read and identifies the server. It does not prove that the account token is valid, or complete permission coverage.",
    identity: serverIdentity,
  },
  api: {
    methods: HTTP_METHODS,
    examples: [
      "postmark api request GET /server",
      "postmark api request GET /servers --query count=10 --query offset=0",
      "postmark api request PUT /server --file request.json --dry-run",
    ],
  },
  groups,
  commands,
};

function errorDetail(body: unknown): ProviderErrorDetail {
  if (!isRecord(body)) return {};
  const { Message: message, ErrorCode: code } = body;
  return {
    ...(typeof message === "string" && message !== "" ? { message } : {}),
    ...(typeof code === "number" || (typeof code === "string" && code !== "") ? { code: String(code) } : {}),
  };
}

function readPage(payload: unknown, _collectionKey: string | undefined, page: PageRequest, rows: unknown[]): PageInfo | undefined {
  if (!isRecord(payload)) return undefined;
  const total = payload.TotalCount;
  if (total !== undefined && (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0)) return undefined;
  const offset = page.cursor === null ? 0 : parseOffset(page.cursor);
  const next = offset + rows.length;
  const exhausted = rows.length === 0 || (total === undefined ? rows.length < page.size : next >= total);
  return {
    nextCursor: exhausted ? null : String(next),
    ...(total === undefined ? {} : { provider: { TotalCount: total } }),
  };
}

function serverIdentity(payload: unknown): { ID: unknown; Name: unknown } {
  if (isRecord(payload) && isServerId(payload.ID) && typeof payload.Name === "string" && payload.Name !== "") {
    return { ID: payload.ID, Name: payload.Name };
  }
  throw new CliError("INVALID_RESPONSE", "Postmark returned a server without an ID and a Name for auth verify.", {
    hint: "Retry later. If the failure persists, the Postmark API contract may have changed.",
  });
}

function isServerId(value: unknown): boolean {
  return typeof value === "number" || (typeof value === "string" && value !== "");
}
