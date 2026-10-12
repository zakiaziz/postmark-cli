import { CliError } from "./core/errors.js";
import type { PageInfo, PageRequest, Provider, ProviderErrorDetail } from "./core/provider.js";
import { HTTP_METHODS } from "./core/types.js";
import { ID_RULE, isRecord, visibleAsciiConstraint } from "./core/values.js";
import { commands, groups, localCommands, parseOffset } from "./registry.js";

export const provider: Provider = {
  bin: "postmark",
  name: "Postmark",
  secrets: [
    { key: "accountToken", label: "account token", validate: visibleAsciiConstraint },
    { key: "serverToken", label: "server token", validate: visibleAsciiConstraint },
  ],
  credentialSets: [
    { name: "account", fields: ["accountToken"] },
    { name: "server", fields: ["serverToken"] },
  ],
  credentialSelection: "per-request",
  credentialOption: { name: "token-type", placeholder: "TOKEN_TYPE", noun: "token type" },
  authScheme: "the X-Postmark-Account-Token header for the account credential or the X-Postmark-Server-Token header for the server credential",
  authorize: (credential) => ({
    ...(credential.accountToken === undefined ? {} : { "X-Postmark-Account-Token": credential.accountToken }),
    ...(credential.serverToken === undefined ? {} : { "X-Postmark-Server-Token": credential.serverToken }),
  }),
  baseUrl: { default: "https://api.postmarkapp.com", allowPath: false },
  endpointFields: [
    {
      key: "defaultMessageStream",
      label: "default message stream",
      placeholder: "ID",
      example: "outbound",
      validate: idConstraint,
    },
  ],
  requestIdHeader: "x-postmark-request-id",
  errorDetail,
  pagination: {
    apply({ query }, page) {
      query.set("count", String(page.size));
      query.set("offset", String(page.cursor === null ? 0 : parseOffset(page.cursor)));
    },
    read: readPage,
  },
  verify: [
    {
      credential: "account",
      method: "GET",
      path: "/servers",
      query: [
        ["count", "1"],
        ["offset", "0"],
      ],
      effect:
        "Sends GET /servers?count=1&offset=0. Success proves that Postmark accepted the account token for that read. It does not prove complete permission coverage.",
      validate: checkServerList,
    },
    {
      credential: "server",
      method: "GET",
      path: "/server",
      query: [],
      effect:
        "Sends GET /server. Success proves that Postmark accepted the server token for that read and identifies the server. It does not prove complete permission coverage.",
      identity: serverIdentity,
    },
  ],
  api: {
    methods: HTTP_METHODS,
    examples: [
      "postmark api request GET /server --token-type server",
      "postmark api request GET /servers --token-type account --query count=10 --query offset=0",
      "postmark api request PUT /server --token-type server --file request.json --dry-run",
    ],
  },
  groups,
  commands,
  localCommands,
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

function idConstraint(value: string): string | undefined {
  const valid = value !== "" && value !== "." && value !== ".." && !/[\u0000-\u001f\u007f]/.test(value);
  return valid ? undefined : `be ${ID_RULE}`;
}

function checkServerList(payload: unknown): void {
  if (isRecord(payload) && Array.isArray(payload.Servers)) return;
  throw new CliError("INVALID_RESPONSE", "Postmark returned no Servers array for auth verify.", {
    hint: "Retry later. If the failure persists, the Postmark API contract may have changed.",
  });
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
