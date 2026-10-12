import { readFileSync } from "node:fs";
import type { Endpoint as ResolvedEndpoint } from "./core/access.js";
import { CliError, stepsFailure, usageError, type StepPartial } from "./core/errors.js";
import type { HookHelpers, LocalCommand, RequestSpec, ResourceCommand, ResponseShape } from "./core/provider.js";
import {
  FILE_OPTION,
  QUERY_OPTION,
  type ArgumentSpec,
  type Context,
  type Exception,
  type GroupSpec,
  type OptionSpec,
} from "./core/registry.js";
import type { HttpMethod } from "./core/types.js";
import { invalidValue, isRecord, parseKeyValue, validateId } from "./core/values.js";

const BIN = "postmark";
const PROVIDER = "Postmark";

/** Commands that Postmark serves with the account token, by path prefix. Every other command uses the server token. */
const ACCOUNT_COMMANDS = ["servers", "domains", "signatures", "data-removals", "templates push"];

const PAGE = { max: 500, default: 100 };
const CAPPED_OFFSET = 10_000;
const ORDERING = "Order is set by Postmark and is undocumented.";
const CAPPED_ORDERING = `${ORDERING} Postmark rejects an offset plus count above ${CAPPED_OFFSET.toLocaleString("en-US")}.`;
const NOT_ATOMIC = "Not atomic. Each item succeeds or fails independently, and nothing is rolled back.";
const ACTION_VOCABULARY = [
  "list",
  "get",
  "search",
  "create",
  "update",
  "replace",
  "delete",
  "archive",
  "restore",
  "send",
  "publish",
  "retry",
  "export",
  "import",
  "batch-get",
  "batch-create",
  "batch-update",
];

/** A request body that must hold a bounded array of objects, under one key or as the whole file. */
interface ItemsRule {
  /** The key that holds the array. Absent when the file itself is the array. */
  key?: string;
  max: number;
  requireEmail?: boolean;
}

interface Page {
  max: number;
  default: number;
  cap?: number;
}

interface Endpoint {
  path: string;
  method: HttpMethod;
  apiPath: string;
  summary: string;
  /** Present for remote mutations; the confirmation prompt and help show it. */
  effect?: string;
  /** A POST that changes nothing. */
  readOnlyPost?: true;
  /** A mutation without a request body. */
  noBody?: true;
  body?: ItemsRule;
  batch?: true;
  /** The response holds one send result per submitted message, and a nonzero ErrorCode fails that message. */
  itemErrors?: true;
  collection?: { key: string; page?: Page };
  file?: string;
  /** The path carries :streamId, which comes from --message-stream. */
  messageStream?: true;
  metrics?: Record<string, string>;
  /** Exceptions recorded in the README beyond the action vocabulary; help ends with them. */
  exceptions?: Exception[];
}

const BATCH_EXCEPTION: Exception = {
  rule: "CLI-BATCH-1",
  reason: "Exits 0 when Postmark reports failed items. Check every item's Status and Message.",
};
const CAP_EXCEPTION: Exception = {
  rule: "CLI-PAGE-3",
  reason: "At the 10,000 cap, meta.next_cursor is 10000, which --cursor rejects. Postmark offers no continuation past the cap.",
};
const SERVER_TOKEN_EXCEPTION: Exception = {
  rule: "CLI-CFG-4",
  reason: "Prints ApiTokens unredacted. Previews, diagnostics, profiles get, and config list stay redacted.",
};
const WEBHOOK_CREDENTIAL_EXCEPTION: Exception = {
  rule: "CLI-CFG-4",
  reason: "Prints authentication credentials and custom header values unredacted. Previews and diagnostics stay redacted.",
};

const BOUNCE_TYPES = [
  "HardBounce",
  "Transient",
  "Unsubscribe",
  "Subscribe",
  "AutoResponder",
  "AddressChange",
  "DnsError",
  "SpamNotification",
  "OpenRelayTest",
  "Unknown",
  "SoftBounce",
  "VirusNotification",
  "ChallengeVerification",
  "BadEmailAddress",
  "SpamComplaint",
  "ManuallyDeactivated",
  "Unconfirmed",
  "Blocked",
  "SMTPApiError",
  "InboundError",
  "DMARCPolicy",
  "TemplateRenderingFailed",
];
const REBOUND_SNIPPET_URL = "https://postmarkapp.com/developer/api/bounce-api#rebound-javascript-snippet";

const EXAMPLE_VALUES: Record<string, string> = {
  bulkRequestId: "e2ecbbfc-fe12-463d-b933-9fe22915106d",
  bounceId: "692560173",
  templateIdOrAlias: "welcome-email",
  serverId: "1234567",
  streamId: "broadcasts",
  messageId: "ac52fb8e-9cd0-4b07-9a55-8d20a4cb04dc",
  domainId: "12345",
  signatureId: "12345",
  triggerId: "12345",
  webhookId: "12345",
  requestId: "1234",
};

const STATS_METRICS: Record<string, string> = {
  overview: "/stats/outbound",
  sends: "/stats/outbound/sends",
  bounces: "/stats/outbound/bounces",
  spam: "/stats/outbound/spam",
  tracked: "/stats/outbound/tracked",
  opens: "/stats/outbound/opens",
  "open-platforms": "/stats/outbound/opens/platforms",
  "open-clients": "/stats/outbound/opens/emailclients",
  clicks: "/stats/outbound/clicks",
  "click-browser-families": "/stats/outbound/clicks/browserfamilies",
  "click-platforms": "/stats/outbound/clicks/platforms",
  "click-location": "/stats/outbound/clicks/location",
};

/** The data sentence of each single-result command's Output help line. Batch commands use their own sentence. */
const RESULTS: Record<string, string> = {
  "emails send": "the send result for the email",
  "emails bulk send": "the bulk email request object",
  "emails bulk get": "the bulk email request status object",
  "bounces delivery-stats get": "the delivery and bounce counts object",
  "bounces get": "the bounce object",
  "bounces dump get": "the bounce dump object holding the raw source",
  "bounces activate": "the activation result with the reactivated bounce",
  "templates send": "the send result for the email",
  "templates push": "the push result listing each template change",
  "templates get": "the template object",
  "templates create": "the created template",
  "templates update": "the updated template",
  "templates delete": "the deletion confirmation",
  "templates validate": "the validation result with the rendered test",
  "server get": "the current server object",
  "server update": "the updated server",
  "servers get": "the server object",
  "servers create": "the created server",
  "servers update": "the updated server",
  "servers delete": "the deletion confirmation",
  "streams get": "the message stream object",
  "streams create": "the created message stream",
  "streams update": "the updated message stream",
  "streams archive": "the archived message stream",
  "streams restore": "the restored message stream",
  "messages outbound get": "the outbound message details object",
  "messages outbound export": "the outbound message dump object holding the raw source",
  "messages inbound get": "the inbound message details object",
  "messages inbound bypass": "the bypass confirmation",
  "messages inbound retry": "the retry confirmation",
  "domains get": "the domain object",
  "domains create": "the created domain",
  "domains update": "the updated domain",
  "domains delete": "the deletion confirmation",
  "domains verify-dkim": "the domain object with its DKIM verification state",
  "domains verify-return-path": "the domain object with its Return-Path verification state",
  "domains verify-spf": "the domain object with its SPF verification state",
  "domains rotate-dkim": "the domain object with its DKIM rotation state",
  "signatures get": "the sender signature object",
  "signatures create": "the created sender signature",
  "signatures update": "the updated sender signature",
  "signatures delete": "the deletion confirmation",
  "signatures resend-confirmation": "the resend confirmation",
  "signatures verify-spf": "the sender signature object with its SPF verification state",
  "signatures request-new-dkim": "the sender signature object with its pending DKIM key",
  "stats outbound get": "the statistics object for the chosen metric",
  "inbound-rules create": "the created inbound rule trigger",
  "inbound-rules delete": "the deletion confirmation",
  "webhooks get": "the webhook object",
  "webhooks create": "the created webhook",
  "webhooks update": "the updated webhook",
  "webhooks delete": "the deletion confirmation",
  "data-removals create": "the created data removal request",
  "data-removals get": "the data removal request status object",
};

const PAGED: Page = PAGE;
const CAPPED: Page = { ...PAGE, cap: CAPPED_OFFSET };

const ENDPOINTS: Endpoint[] = [
  { path: "emails send", method: "POST", apiPath: "/email", summary: "Send one email.", effect: "Sends one email from the server.", file: "email.json" },
  {
    path: "emails batch-send",
    method: "POST",
    apiPath: "/email/batch",
    summary: "Send up to 500 emails in one request.",
    effect: "Sends up to 500 emails from the server, each processed independently.",
    body: { max: 500 },
    batch: true,
    itemErrors: true,
    file: "emails.json",
  },
  {
    path: "emails bulk send",
    method: "POST",
    apiPath: "/email/bulk",
    summary: "Start a bulk email request.",
    effect: "Starts an asynchronous bulk email request and returns its ID.",
    file: "bulk.json",
  },
  { path: "emails bulk get", method: "GET", apiPath: "/email/bulk/:bulkRequestId", summary: "Get the status of a bulk email request." },
  { path: "bounces delivery-stats get", method: "GET", apiPath: "/deliverystats", summary: "Get delivery and bounce counts for the server." },
  { path: "bounces list", method: "GET", apiPath: "/bounces", summary: "List bounces.", collection: { key: "Bounces", page: PAGED } },
  { path: "bounces get", method: "GET", apiPath: "/bounces/:bounceId", summary: "Get one bounce." },
  { path: "bounces dump get", method: "GET", apiPath: "/bounces/:bounceId/dump", summary: "Get the raw source of a bounce." },
  {
    path: "bounces activate",
    method: "PUT",
    apiPath: "/bounces/:bounceId/activate",
    summary: "Reactivate the address of a bounce.",
    effect: "Reactivates the inactive address of bounce BOUNCE_ID.",
    noBody: true,
  },
  {
    path: "templates send",
    method: "POST",
    apiPath: "/email/withTemplate",
    summary: "Send one email from a template.",
    effect: "Sends one email rendered from a template.",
    file: "template-email.json",
  },
  {
    path: "templates batch-send",
    method: "POST",
    apiPath: "/email/batchWithTemplates",
    summary: "Send up to 500 emails from templates in one request.",
    effect: "Sends up to 500 emails rendered from templates, each processed independently.",
    body: { key: "Messages", max: 500 },
    batch: true,
    itemErrors: true,
    file: "template-emails.json",
  },
  {
    path: "templates push",
    method: "PUT",
    apiPath: "/templates/push",
    summary: "Push templates to another server.",
    effect: "Copies templates from the source server to the destination server, or only reports the changes when PerformChanges is false.",
    file: "push.json",
  },
  { path: "templates get", method: "GET", apiPath: "/templates/:templateIdOrAlias", summary: "Get one template." },
  {
    path: "templates create",
    method: "POST",
    apiPath: "/templates",
    summary: "Create a template.",
    effect: "Creates a template on the server.",
    file: "template.json",
  },
  {
    path: "templates update",
    method: "PUT",
    apiPath: "/templates/:templateIdOrAlias",
    summary: "Update a template.",
    effect: "Changes the supplied fields of template TEMPLATE_ID_OR_ALIAS.",
    file: "template.json",
  },
  { path: "templates list", method: "GET", apiPath: "/templates", summary: "List templates.", collection: { key: "Templates", page: PAGED } },
  {
    path: "templates delete",
    method: "DELETE",
    apiPath: "/templates/:templateIdOrAlias",
    summary: "Delete a template.",
    effect: "Deletes template TEMPLATE_ID_OR_ALIAS. Postmark documents no way to restore it.",
  },
  {
    path: "templates validate",
    method: "POST",
    apiPath: "/templates/validate",
    summary: "Validate a template and render a test.",
    readOnlyPost: true,
    file: "template.json",
  },
  { path: "server get", method: "GET", apiPath: "/server", summary: "Get the current server.", exceptions: [SERVER_TOKEN_EXCEPTION] },
  {
    path: "server update",
    method: "PUT",
    apiPath: "/server",
    summary: "Update the current server.",
    effect: "Changes the supplied settings of the current server.",
    file: "server.json",
    exceptions: [SERVER_TOKEN_EXCEPTION],
  },
  { path: "servers list", method: "GET", apiPath: "/servers", summary: "List servers.", collection: { key: "Servers", page: PAGED }, exceptions: [SERVER_TOKEN_EXCEPTION] },
  { path: "servers get", method: "GET", apiPath: "/servers/:serverId", summary: "Get one server.", exceptions: [SERVER_TOKEN_EXCEPTION] },
  {
    path: "servers create",
    method: "POST",
    apiPath: "/servers",
    summary: "Create a server.",
    effect: "Creates a server in the account.",
    file: "server.json",
    exceptions: [SERVER_TOKEN_EXCEPTION],
  },
  {
    path: "servers update",
    method: "PUT",
    apiPath: "/servers/:serverId",
    summary: "Update a server.",
    effect: "Changes the supplied settings of server SERVER_ID.",
    file: "server.json",
    exceptions: [SERVER_TOKEN_EXCEPTION],
  },
  {
    path: "servers delete",
    method: "DELETE",
    apiPath: "/servers/:serverId",
    summary: "Delete a server.",
    effect: "Deletes server SERVER_ID and everything on it. Postmark documents no way to restore it.",
  },
  { path: "streams list", method: "GET", apiPath: "/message-streams", summary: "List message streams.", collection: { key: "MessageStreams" } },
  { path: "streams get", method: "GET", apiPath: "/message-streams/:streamId", summary: "Get one message stream." },
  {
    path: "streams create",
    method: "POST",
    apiPath: "/message-streams",
    summary: "Create a message stream.",
    effect: "Creates a message stream on the server.",
    file: "stream.json",
  },
  {
    path: "streams update",
    method: "PUT",
    apiPath: "/message-streams/:streamId",
    summary: "Update a message stream.",
    effect: "Changes the supplied settings of message stream STREAM_ID.",
    file: "stream.json",
  },
  {
    path: "streams archive",
    method: "POST",
    apiPath: "/message-streams/:streamId/archive",
    summary: "Archive a message stream.",
    effect: "Archives message stream STREAM_ID. It can be restored with streams restore within 45 days, after which Postmark deletes it.",
    noBody: true,
  },
  {
    path: "streams restore",
    method: "POST",
    apiPath: "/message-streams/:streamId/unarchive",
    summary: "Restore an archived message stream.",
    effect: "Restores archived message stream STREAM_ID.",
    noBody: true,
  },
  {
    path: "messages outbound search",
    method: "GET",
    apiPath: "/messages/outbound",
    summary: "Search outbound messages.",
    collection: { key: "Messages", page: CAPPED },
    exceptions: [CAP_EXCEPTION],
  },
  { path: "messages outbound get", method: "GET", apiPath: "/messages/outbound/:messageId/details", summary: "Get the details of an outbound message." },
  { path: "messages outbound export", method: "GET", apiPath: "/messages/outbound/:messageId/dump", summary: "Export the raw source of an outbound message." },
  {
    path: "messages inbound search",
    method: "GET",
    apiPath: "/messages/inbound",
    summary: "Search inbound messages.",
    collection: { key: "InboundMessages", page: CAPPED },
    exceptions: [CAP_EXCEPTION],
  },
  { path: "messages inbound get", method: "GET", apiPath: "/messages/inbound/:messageId/details", summary: "Get the details of an inbound message." },
  {
    path: "messages inbound bypass",
    method: "PUT",
    apiPath: "/messages/inbound/:messageId/bypass",
    summary: "Bypass the rules that blocked an inbound message.",
    effect: "Bypasses the rules that blocked inbound message MESSAGE_ID.",
    noBody: true,
  },
  {
    path: "messages inbound retry",
    method: "PUT",
    apiPath: "/messages/inbound/:messageId/retry",
    summary: "Retry a failed inbound message.",
    effect: "Queues failed inbound message MESSAGE_ID for processing again.",
    noBody: true,
  },
  {
    path: "messages opens search",
    method: "GET",
    apiPath: "/messages/outbound/opens",
    summary: "Search message opens.",
    collection: { key: "Opens", page: CAPPED },
    exceptions: [CAP_EXCEPTION],
  },
  {
    path: "messages opens list",
    method: "GET",
    apiPath: "/messages/outbound/opens/:messageId",
    summary: "List the opens of one message.",
    collection: { key: "Opens", page: PAGED },
  },
  {
    path: "messages clicks search",
    method: "GET",
    apiPath: "/messages/outbound/clicks",
    summary: "Search message clicks.",
    collection: { key: "Clicks", page: PAGED },
  },
  {
    path: "messages clicks list",
    method: "GET",
    apiPath: "/messages/outbound/clicks/:messageId",
    summary: "List the clicks of one message.",
    collection: { key: "Clicks", page: PAGED },
  },
  { path: "domains list", method: "GET", apiPath: "/domains", summary: "List domains.", collection: { key: "Domains", page: PAGED } },
  { path: "domains get", method: "GET", apiPath: "/domains/:domainId", summary: "Get one domain." },
  {
    path: "domains create",
    method: "POST",
    apiPath: "/domains",
    summary: "Create a domain.",
    effect: "Creates a sending domain in the account.",
    file: "domain.json",
  },
  {
    path: "domains update",
    method: "PUT",
    apiPath: "/domains/:domainId",
    summary: "Update a domain.",
    effect: "Changes the supplied settings of domain DOMAIN_ID.",
    file: "domain.json",
  },
  {
    path: "domains delete",
    method: "DELETE",
    apiPath: "/domains/:domainId",
    summary: "Delete a domain.",
    effect: "Deletes domain DOMAIN_ID. Postmark documents no way to restore it.",
  },
  {
    path: "domains verify-dkim",
    method: "PUT",
    apiPath: "/domains/:domainId/verifyDkim",
    summary: "Verify the DKIM record of a domain.",
    effect: "Requests a DKIM check for domain DOMAIN_ID.",
    noBody: true,
  },
  {
    path: "domains verify-return-path",
    method: "PUT",
    apiPath: "/domains/:domainId/verifyReturnPath",
    summary: "Verify the Return-Path record of a domain.",
    effect: "Requests a Return-Path check for domain DOMAIN_ID.",
    noBody: true,
  },
  {
    path: "domains verify-spf",
    method: "PUT",
    apiPath: "/domains/:domainId/verifyspf",
    summary: "Verify the SPF record of a domain.",
    effect: "Requests an SPF check for domain DOMAIN_ID.",
    noBody: true,
  },
  {
    path: "domains rotate-dkim",
    method: "PUT",
    apiPath: "/domains/:domainId/rotatedkim",
    summary: "Rotate the DKIM keys of a domain.",
    effect: "Starts DKIM key rotation for domain DOMAIN_ID.",
    noBody: true,
  },
  {
    path: "signatures list",
    method: "GET",
    apiPath: "/senders",
    summary: "List sender signatures.",
    collection: { key: "SenderSignatures", page: PAGED },
  },
  { path: "signatures get", method: "GET", apiPath: "/senders/:signatureId", summary: "Get one sender signature." },
  {
    path: "signatures create",
    method: "POST",
    apiPath: "/senders",
    summary: "Create a sender signature.",
    effect: "Creates a sender signature and sends its confirmation email.",
    file: "signature.json",
  },
  {
    path: "signatures update",
    method: "PUT",
    apiPath: "/senders/:signatureId",
    summary: "Update a sender signature.",
    effect: "Changes the supplied fields of sender signature SIGNATURE_ID.",
    file: "signature.json",
  },
  {
    path: "signatures delete",
    method: "DELETE",
    apiPath: "/senders/:signatureId",
    summary: "Delete a sender signature.",
    effect: "Deletes sender signature SIGNATURE_ID. Postmark documents no way to restore it.",
  },
  {
    path: "signatures resend-confirmation",
    method: "POST",
    apiPath: "/senders/:signatureId/resend",
    summary: "Resend the confirmation email of a sender signature.",
    effect: "Resends the confirmation email for sender signature SIGNATURE_ID.",
    noBody: true,
  },
  {
    path: "signatures verify-spf",
    method: "PUT",
    apiPath: "/senders/:signatureId/verifyspf",
    summary: "Verify the SPF record of a sender signature.",
    effect: "Requests an SPF check for sender signature SIGNATURE_ID.",
    noBody: true,
  },
  {
    path: "signatures request-new-dkim",
    method: "POST",
    apiPath: "/senders/:signatureId/requestnewdkim",
    summary: "Request a new DKIM key for a sender signature.",
    effect: "Requests a new DKIM key for sender signature SIGNATURE_ID.",
    noBody: true,
  },
  {
    path: "stats outbound get",
    method: "GET",
    apiPath: "/stats/outbound",
    summary: "Get outbound statistics for one metric.",
    metrics: STATS_METRICS,
  },
  {
    path: "inbound-rules list",
    method: "GET",
    apiPath: "/triggers/inboundrules",
    summary: "List inbound rule triggers.",
    collection: { key: "InboundRules", page: PAGED },
  },
  {
    path: "inbound-rules create",
    method: "POST",
    apiPath: "/triggers/inboundrules",
    summary: "Create an inbound rule trigger.",
    effect: "Creates an inbound rule trigger on the server.",
    file: "rule.json",
  },
  {
    path: "inbound-rules delete",
    method: "DELETE",
    apiPath: "/triggers/inboundrules/:triggerId",
    summary: "Delete an inbound rule trigger.",
    effect: "Deletes inbound rule trigger TRIGGER_ID. Postmark documents no way to restore it.",
  },
  { path: "webhooks list", method: "GET", apiPath: "/webhooks", summary: "List webhooks.", collection: { key: "Webhooks" }, exceptions: [WEBHOOK_CREDENTIAL_EXCEPTION] },
  { path: "webhooks get", method: "GET", apiPath: "/webhooks/:webhookId", summary: "Get one webhook.", exceptions: [WEBHOOK_CREDENTIAL_EXCEPTION] },
  {
    path: "webhooks create",
    method: "POST",
    apiPath: "/webhooks",
    summary: "Create a webhook.",
    effect: "Creates a webhook on the server.",
    file: "webhook.json",
    exceptions: [WEBHOOK_CREDENTIAL_EXCEPTION],
  },
  {
    path: "webhooks update",
    method: "PUT",
    apiPath: "/webhooks/:webhookId",
    summary: "Update a webhook.",
    effect: "Changes the supplied fields of webhook WEBHOOK_ID.",
    file: "webhook.json",
    exceptions: [WEBHOOK_CREDENTIAL_EXCEPTION],
  },
  {
    path: "webhooks delete",
    method: "DELETE",
    apiPath: "/webhooks/:webhookId",
    summary: "Delete a webhook.",
    effect: "Deletes webhook WEBHOOK_ID. Postmark documents no way to restore it.",
  },
  {
    path: "suppressions list",
    method: "GET",
    apiPath: "/message-streams/:streamId/suppressions/dump",
    summary: "List the suppressions of a message stream.",
    collection: { key: "Suppressions" },
    messageStream: true,
  },
  {
    path: "suppressions batch-create",
    method: "POST",
    apiPath: "/message-streams/:streamId/suppressions",
    summary: "Suppress up to 50 addresses in a message stream.",
    effect: "Adds up to 50 addresses to the suppression list of the message stream, each processed independently.",
    body: { key: "Suppressions", max: 50, requireEmail: true },
    batch: true,
    messageStream: true,
    file: "suppressions.json",
    exceptions: [BATCH_EXCEPTION],
  },
  {
    path: "suppressions batch-delete",
    method: "POST",
    apiPath: "/message-streams/:streamId/suppressions/delete",
    summary: "Remove up to 50 suppressions from a message stream.",
    effect: "Removes up to 50 addresses from the suppression list of the message stream, each processed independently. Postmark documents no way to restore them.",
    body: { key: "Suppressions", max: 50, requireEmail: true },
    batch: true,
    messageStream: true,
    file: "suppressions.json",
    exceptions: [BATCH_EXCEPTION],
  },
  {
    path: "data-removals create",
    method: "POST",
    apiPath: "/data-removals",
    summary: "Create a data removal request.",
    effect: "Creates an asynchronous data removal request and returns its ID.",
    file: "removal.json",
  },
  { path: "data-removals get", method: "GET", apiPath: "/data-removals/:requestId", summary: "Get the status of a data removal request." },
];

export const groups: GroupSpec[] = [
  {
    path: ["bounces"],
    summary: "List, get, and reactivate bounces, read delivery statistics, and look up bounce reference data.",
    title: "Manage bounces.",
  },
  { path: ["bounces", "delivery-stats"], summary: "Read delivery and bounce counts.", title: "Inspect delivery statistics." },
  { path: ["bounces", "dump"], summary: "Read the raw source of bounces.", title: "Inspect bounce dumps." },
  { path: ["bounces", "rebound-snippet"], summary: "Look up the rebound snippet documentation.", title: "Inspect the rebound snippet." },
  { path: ["bounces", "types"], summary: "List the bounce type names.", title: "Inspect bounce types." },
  { path: ["data-removals"], summary: "Create and check data removal requests.", title: "Manage data removal requests." },
  { path: ["domains"], summary: "Manage sending domains and verify their DNS records.", title: "Manage sending domains." },
  { path: ["emails"], summary: "Send emails singly, in batches, and in bulk requests.", title: "Manage emails." },
  { path: ["emails", "bulk"], summary: "Send and track bulk email requests.", title: "Manage bulk email requests." },
  { path: ["inbound-rules"], summary: "List, create, and delete inbound rule triggers.", title: "Manage inbound rules." },
  {
    path: ["messages"],
    summary: "Search and inspect outbound and inbound messages, opens, and clicks.",
    title: "Manage messages.",
  },
  { path: ["messages", "clicks"], summary: "Search and list message clicks.", title: "Inspect message clicks." },
  { path: ["messages", "inbound"], summary: "Search, inspect, bypass, and retry inbound messages.", title: "Manage inbound messages." },
  { path: ["messages", "opens"], summary: "Search and list message opens.", title: "Inspect message opens." },
  { path: ["messages", "outbound"], summary: "Search, inspect, and export outbound messages.", title: "Inspect outbound messages." },
  { path: ["server"], summary: "Get and update the current server.", title: "Manage the current server." },
  { path: ["servers"], summary: "List, get, create, update, and delete servers.", title: "Manage servers." },
  { path: ["signatures"], summary: "Manage sender signatures and verify their DNS records.", title: "Manage sender signatures." },
  { path: ["stats"], summary: "Get outbound email statistics.", title: "Inspect statistics." },
  { path: ["stats", "outbound"], summary: "Get outbound email statistics.", title: "Inspect outbound statistics." },
  {
    path: ["streams"],
    summary: "List, get, create, update, archive, and restore message streams.",
    title: "Manage message streams.",
  },
  { path: ["suppressions"], summary: "List suppressions and create or delete them in batches.", title: "Manage suppressions." },
  { path: ["templates"], summary: "Manage, validate, push, and send templates.", title: "Manage templates." },
  { path: ["webhooks"], summary: "List, get, create, update, and delete webhooks.", title: "Manage webhooks." },
];

export const commands: ResourceCommand[] = ENDPOINTS.map(resourceCommand);

export const localCommands: LocalCommand[] = [
  {
    path: ["bounces", "types", "list"],
    summary: "List the bounce type names.",
    arguments: [],
    options: [],
    output: `Collection envelope. data is an array of the ${PROVIDER} bounce type names, the values of the Type field of a bounce; meta is empty.`,
    unpaginated: "Not paginated. The command lists every entry.",
    examples: [`${BIN} bounces types list`, `${BIN} bounces types list --format json`],
    run: () => ({ data: BOUNCE_TYPES }),
  },
  {
    path: ["bounces", "rebound-snippet", "get"],
    summary: "Get the documentation URL of the rebound snippet.",
    arguments: [],
    options: [],
    output: `Resource envelope. data has url, the ${PROVIDER} documentation page for the rebound JavaScript snippet; meta is empty.`,
    examples: [`${BIN} bounces rebound-snippet get`, `${BIN} bounces rebound-snippet get --format json`],
    run: () => ({ data: { url: REBOUND_SNIPPET_URL } }),
  },
];

/**
 * Parses a --cursor value. Postmark pages by offset, so the cursor is the decimal offset
 * of the first unread item, and an endpoint that caps offset plus count rejects offsets at the cap.
 */
export function parseOffset(cursor: string, cap?: number): number {
  const offset = /^(?:0|[1-9][0-9]{0,15})$/.test(cursor) ? Number(cursor) : Number.NaN;
  if (Number.isSafeInteger(offset) && (cap === undefined || offset < cap)) return offset;
  const limit = cap === undefined ? "a nonnegative decimal integer" : `a decimal integer from 0 to ${cap - 1}`;
  const hint =
    cap === undefined
      ? "Use the meta.next_cursor value from a previous result."
      : "Narrow the query with --query filters instead of paging further.";
  throw invalidValue("--cursor", `be ${limit}`, cursor, hint, cap === undefined ? ">=0" : `0-${cap - 1}`);
}

function resourceCommand(endpoint: Endpoint): ResourceCommand {
  const words = endpoint.path.split(" ");
  const params = pathParams(endpoint);
  const needsBody = endpoint.method !== "GET" && endpoint.method !== "DELETE" && endpoint.noBody !== true;
  const page = endpoint.collection?.page;
  const action = words.at(-1) ?? "";
  const argumentSpecs = params.map(argumentSpec);
  const exceptions: Exception[] = [
    ...(ACTION_VOCABULARY.includes(action)
      ? []
      : [{ rule: "CLI-GRAM-4", reason: `Preserves the ${PROVIDER} term "${action}".` }]),
    ...(endpoint.exceptions ?? []),
  ];
  const common = {
    path: words,
    summary: endpoint.summary,
    arguments: argumentSpecs,
    options: optionSpecs(endpoint, needsBody),
    effects: effectsOf(endpoint),
    output: outputText(endpoint),
    credential: credentialOf(endpoint),
    examples: examplesOf(endpoint, params, needsBody),
    ...(exceptions.length > 0 ? { exceptions } : {}),
  };
  return {
    ...common,
    method: endpoint.method,
    ...(endpoint.itemErrors ? { settle: settleSends(endpoint) } : {}),
    ...(endpoint.collection ? { collectionKey: endpoint.collection.key } : {}),
    ...(page ? { pagination: { max: page.max, default: page.default, ordering: page.cap === undefined ? ORDERING : CAPPED_ORDERING } } : {}),
    ...(endpoint.collection && !page
      ? { unpaginated: `Not paginated. ${PROVIDER} returns the full list in one response; meta has profile.` }
      : {}),
    ...(endpoint.method === "GET" && !endpoint.collection && argumentSpecs.length > 0 ? { emptyIsNotFound: true } : {}),
    request: (context, resolved) => requestOf(endpoint, params, context, resolved),
  };
}

function credentialOf(endpoint: Endpoint): string {
  return ACCOUNT_COMMANDS.some((prefix) => endpoint.path === prefix || endpoint.path.startsWith(`${prefix} `)) ? "account" : "server";
}

function pathParams(endpoint: Endpoint): string[] {
  return [...endpoint.apiPath.matchAll(/:([A-Za-z0-9]+)/g)]
    .map((match) => match[1] ?? "")
    .filter((param) => !(endpoint.messageStream && param === "streamId"));
}

function argumentName(param: string): string {
  return param.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
}

function argumentSpec(param: string): ArgumentSpec {
  const name = argumentName(param);
  const words = param.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ");
  const text = words.map((word) => (word === "Id" ? "ID" : word.toLowerCase())).join(" ");
  return {
    name,
    description: `${text.charAt(0).toUpperCase()}${text.slice(1)}.`,
    check: (value) => validateId(name, value),
  };
}

function optionSpecs(endpoint: Endpoint, needsBody: boolean): OptionSpec[] {
  const options: OptionSpec[] = [];
  if (endpoint.messageStream) {
    options.push({
      name: "message-stream",
      placeholder: "ID",
      type: "string",
      description: "Message stream ID. Find IDs with 'streams list'. Required unless the defaultMessageStream setting is set.",
      check: (value) => validateId("--message-stream", value),
    });
  }
  if (endpoint.metrics) {
    options.push({
      name: "metric",
      placeholder: "METRIC",
      type: "enum",
      choices: Object.keys(endpoint.metrics),
      required: true,
      description: "Statistic to retrieve.",
    });
  }
  if (needsBody) options.push({ ...FILE_OPTION, required: true });
  if (endpoint.method === "GET") options.push(QUERY_OPTION);
  return options;
}

function effectsOf(endpoint: Endpoint): ResourceCommand["effects"] {
  if (endpoint.effect === undefined) {
    return endpoint.readOnlyPost ? { kind: "read", summary: "Sends a POST request that changes nothing." } : { kind: "read" };
  }
  return { kind: "remote-mutation", summary: endpoint.effect, ...(endpoint.batch ? { atomicity: NOT_ATOMIC } : {}) };
}

function outputText(endpoint: Endpoint): string {
  const { collection } = endpoint;
  if (collection?.page) {
    return `Collection envelope. data is an array of ${collection.key}; meta has profile, next_cursor (a decimal offset), has_more, and provider.TotalCount when ${PROVIDER} reports it.`;
  }
  if (collection) return `Collection envelope. data is an array of ${collection.key}; meta has profile.`;
  if (endpoint.itemErrors) {
    return `Resource envelope. data is an array with one send result per submitted message, in submission order; meta has profile. When ${PROVIDER} rejects any message, the command exits 8 with PARTIAL_FAILURE and error.partial lists the completed and failed messages.`;
  }
  if (endpoint.batch) {
    return `Resource envelope. data is the ${PROVIDER} response with one result per submitted item; meta has profile. ${PROVIDER} answers HTTP 200 when items fail, so check every item.`;
  }
  const result = RESULTS[endpoint.path];
  if (result === undefined) throw new Error(`No Output sentence for command "${endpoint.path}".`);
  return `Resource envelope. data is ${result}; meta has profile.`;
}

function examplesOf(endpoint: Endpoint, params: string[], needsBody: boolean): string[] {
  const parts = [BIN, endpoint.path, ...params.map((param) => EXAMPLE_VALUES[param] ?? "ID")];
  if (endpoint.messageStream) parts.push("--message-stream", "outbound");
  if (endpoint.metrics) parts.push("--metric", "overview");
  const base = parts.join(" ");
  const withFile = needsBody ? `${base} --file ${endpoint.file ?? "request.json"}` : base;
  if (endpoint.effect !== undefined) return [`${withFile} --dry-run`, `${withFile} --yes`];
  if (needsBody) return [withFile];
  if (endpoint.collection?.page) return [base, `${base} --all --max-items 200`, `${base} --format json`];
  return [base, `${base} --format json`];
}

function requestOf(endpoint: Endpoint, params: string[], context: Context, resolved: ResolvedEndpoint): RequestSpec {
  const page = endpoint.collection?.page;
  const query = userQuery(context, page !== undefined);
  if (page) checkCursor(context, page);
  const body = readBody(endpoint, context);
  const values = new Map(params.map((param, index) => [param, context.args[index] ?? ""]));
  const stream = endpoint.messageStream ? messageStream(endpoint, context, resolved) : undefined;
  if (stream !== undefined) values.set("streamId", stream);
  const metric = context.options.string("metric");
  const template = metric === undefined ? endpoint.apiPath : (endpoint.metrics?.[metric] ?? endpoint.apiPath);
  const path = template.replace(/:([A-Za-z0-9]+)/g, (_, param: string) => encodeURIComponent(values.get(param) ?? ""));
  const effect = endpoint.effect === undefined ? undefined : filledEffect(endpoint.effect, context, stream);
  return {
    path,
    ...(query.length > 0 ? { query } : {}),
    ...(body === undefined ? {} : { body }),
    ...(effect === undefined ? {} : { effect }),
  };
}

/** The --message-stream option, or the defaultMessageStream setting when the option is absent. */
function messageStream(endpoint: Endpoint, context: Context, resolved: ResolvedEndpoint): string {
  const stream = context.options.string("message-stream") ?? resolved.get("defaultMessageStream");
  if (stream !== undefined) return stream;
  throw usageError(
    `Missing required option --message-stream for "${endpoint.path}".`,
    `Add --message-stream ID, or set ${BIN.toUpperCase()}_DEFAULT_MESSAGE_STREAM or run '${BIN} profiles update NAME --default-message-stream ID'.`,
  );
}

function filledEffect(effect: string, context: Context, stream: string | undefined): string {
  const text = context.spec.arguments.reduce(
    (current, argument, index) => current.replaceAll(argument.name, context.args[index] ?? argument.name),
    effect,
  );
  return stream === undefined ? text : `${text} Message stream: ${stream}.`;
}

function userQuery(context: Context, paginated: boolean): [string, string][] {
  const entries = context.options.strings("query").map((pair) => parseKeyValue("--query", pair));
  if (!paginated) return entries;
  const reserved = entries.find(([key]) => ["count", "offset"].includes(key.toLowerCase()));
  if (reserved) {
    throw usageError(`--query must not set "${reserved[0]}" on a paginated command.`, "Use --page-size and --cursor instead.", {
      option: "--query",
      received: reserved[0],
    });
  }
  return entries;
}

function checkCursor(context: Context, page: Page): void {
  const cursor = context.options.string("cursor");
  if (cursor !== undefined) parseOffset(cursor, page.cap);
}

function readBody(endpoint: Endpoint, context: Context): unknown {
  const source = context.options.string("file");
  if (source === undefined) return undefined;
  const body = readJsonFile(source);
  const rule = endpoint.body;
  if (rule && rule.key === undefined) {
    checkItems(rule, body);
    return body;
  }
  if (!isRecord(body) || Object.keys(body).length === 0) {
    throw usageError("--file must contain a nonempty JSON object.", `Put every field of "${endpoint.path}" in the file.`);
  }
  if (rule) checkItems(rule, body);
  return body;
}

function checkItems(rule: ItemsRule, body: unknown): void {
  const items = rule.key === undefined ? body : isRecord(body) ? body[rule.key] : undefined;
  if (!Array.isArray(items) || items.length < 1 || items.length > rule.max || !items.every(isNonemptyObject)) {
    const subject = rule.key === undefined ? "--file" : `--file ${rule.key}`;
    const location = rule.key === undefined ? "a JSON array" : `a JSON array under "${rule.key}"`;
    throw usageError(
      `${subject} must contain ${location} of 1 to ${rule.max} nonempty objects.`,
      `Split larger sets into requests of at most ${rule.max} items.`,
    );
  }
  if (!rule.requireEmail) return;
  const index = items.findIndex((item) => typeof item.EmailAddress !== "string" || item.EmailAddress === "");
  if (index === -1) return;
  throw usageError(`--file ${rule.key} item ${index + 1} must have a nonempty EmailAddress.`, "Name every address explicitly.");
}

/** Fails PARTIAL_FAILURE when Postmark rejects any message of the batch the request sent. */
function settleSends(endpoint: Endpoint): NonNullable<ResponseShape["settle"]> {
  return (result, _context, helpers) => checkSendResults(submittedItems(endpoint.body, helpers.request.body), result.data, helpers);
}

/** The messages of a body that readBody already checked against its ItemsRule. */
function submittedItems(rule: ItemsRule | undefined, body: unknown): Record<string, unknown>[] {
  const items = rule?.key === undefined ? body : isRecord(body) ? body[rule.key] : undefined;
  return Array.isArray(items) ? items.filter(isRecord) : [];
}

function messageName(message: Record<string, unknown>, index: number): string {
  const recipient = typeof message.To === "string" && message.To !== "" ? ` (to ${message.To})` : "";
  return `message ${index + 1}${recipient}`;
}

/**
 * Postmark answers HTTP 200 with one result per message, in order. A nonzero ErrorCode means it rejected that message.
 * Returns the results when every message was accepted and fails PARTIAL_FAILURE otherwise.
 */
function checkSendResults(sent: Record<string, unknown>[], data: unknown, helpers: HookHelpers): unknown {
  if (!Array.isArray(data) || data.length !== sent.length) {
    throw new CliError(
      "INVALID_RESPONSE",
      `${PROVIDER} returned ${Array.isArray(data) ? data.length : "no array of"} results for ${sent.length} submitted messages.`,
      { hint: "Check the remote state before retrying.", outcome: "unknown", provider: helpers.provider },
    );
  }
  const partial: StepPartial = { completed: [], failed: [], not_attempted: [] };
  let unreadable = false;
  for (const [index, result] of data.entries()) {
    const name = messageName(sent[index] ?? {}, index);
    if (!isRecord(result) || typeof result.ErrorCode !== "number") {
      unreadable = true;
      partial.failed.push({
        step: name,
        error: { code: "INVALID_RESPONSE", message: `${PROVIDER} returned no numeric ErrorCode for the message, so its outcome is unknown.` },
      });
      continue;
    }
    if (result.ErrorCode === 0) {
      partial.completed.push({ step: name, result });
      continue;
    }
    const reason = typeof result.Message === "string" && result.Message !== "" ? `: ${result.Message}` : "";
    partial.failed.push({
      step: name,
      error: {
        code: "INVALID_REQUEST",
        message: `${PROVIDER} rejected the message${reason} (ErrorCode ${result.ErrorCode}).`,
        provider: { code: result.ErrorCode },
      },
    });
  }
  if (partial.failed.length === 0) return data;
  throw stepsFailure(partial, {
    unit: "items",
    provider: helpers.provider,
    hint: unreadable
      ? "Check the remote state of the failed messages before sending them again. Postmark accepted the completed messages."
      : "Send only the failed messages again. Postmark accepted the completed messages.",
    ...(unreadable ? { cause: "INVALID_RESPONSE" as const, outcome: "unknown" as const } : {}),
  });
}

function isNonemptyObject(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).length > 0;
}

function readJsonFile(path: string): unknown {
  let text: string;
  try {
    text = readFileSync(path === "-" ? 0 : path, "utf8");
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    throw usageError(
      `--file could not be read${typeof code === "string" ? ` (${code})` : ""}.`,
      "Check that the path exists and is readable, or use - for stdin.",
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw usageError("--file must contain valid JSON.", "Fix the JSON syntax in the input.");
  }
}
