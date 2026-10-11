# Postmark CLI

A CLI for Postmark account and server APIs. This repository owns the `postmark` executable.

## Install

Install from npm with Node 22 or newer, or with Bun:

```bash
npm install -g @zakiaziz/postmark-cli
bun add -g @zakiaziz/postmark-cli
```

To work on the CLI, build and link a checkout with `bun install`, `bun run build`, and `bun link`.

## Setup

```bash
export POSTMARK_SERVER_TOKEN='...'
postmark setup work --from-env
postmark auth verify
postmark templates list
postmark templates list --format pretty
postmark templates list --format human
```

Setup creates and activates a profile. It never overwrites an existing profile and does not prompt for secrets. Use environment variables or profile files protected with mode 0600. Configuration directories use mode 0700.

Precedence is explicit flags, `POSTMARK_ACCOUNT_TOKEN`/`POSTMARK_SERVER_TOKEN`/`POSTMARK_BASE_URL`, selected profile, global configuration, then defaults. Profile selection is `--profile`, `POSTMARK_PROFILE`, then the active profile. A missing selected profile fails with exit 3, even if a token exists in the environment. An absolute `XDG_CONFIG_HOME` selects the configuration root; otherwise the CLI uses `~/.config/postmark`. The default API origin is `https://api.postmarkapp.com`.

`auth verify` checks the available token classes using account `/servers` or server `/server`. Use `--auth account` or `--auth server` to select one. This proves access to those resources, not full permission coverage or user identity. Mixed success exits 8 and records each outcome. Total failure preserves the underlying error code.

## Output and automation

Every operational command defaults to compact, uncolored JSON plus one newline, including in a terminal. First-class results use `{"data":...,"meta":...}`. Collections use an array; individual resources use an object or null. Provider field names remain unchanged. Provider resource responses, such as server API-token fields, intentionally retain returned secrets; profile/config inspection and diagnostics redact them. Raw API results retain provider JSON shape; text becomes a JSON string and an empty body becomes null. Binary responses fail explicitly.

`--format pretty` produces the same document with two-space indentation and syntax highlighting. `--format human` produces tables or labeled fields. Color defaults to auto and applies independently to stdout/stderr. Auto requires a terminal and an unset or empty `NO_COLOR`; `--color always` overrides both conditions. JSON never includes ANSI color. Help, version, and completion scripts are text exceptions.

Results use stdout. Prompts, diagnostics, and errors use stderr. `--quiet` preserves results and errors; `--verbose` emits redacted request diagnostics. The flags conflict.

Mutations require terminal confirmation or `--yes`. The prompt identifies the profile, target, and effect. CI, nonterminal stdin, `--no-input`, and request content from stdin disable prompts; missing confirmation exits 9. CI is active when `CI` is nonempty and is neither 0 nor false, ignoring case. `--dry-run` validates locally and prints a redacted request without network access or writes. Preview success does not guarantee execution success.

Template validation is a read-only POST. Raw non-GET/HEAD/OPTIONS calls conservatively require confirmation. Sends, removals, and deletes can have irreversible effects; there is no general undo. Batches are not atomic and do not roll back completed items. A partial batch or auth verification returns exit 8 with all provider outcomes in `error.partial`. Async bulk/data-removal responses preserve the provider job ID/status fields; this CLI has no wait option.

## Input

IDs remain opaque strings. Suppressions take their stream scope through `--message-stream` or the profile defaultMessageStream. Ordinary text, including `@file`, is literal.

Use `--file PATH` for complete JSON input, or `--file -` for stdin. Files must contain an object or array matching the command. First-class non-batch bodies require a nonempty object. Email batches require 1..500 objects; template batches use a Messages array of 1..500 objects; suppression batches use a Suppressions array of 1..50 explicit EmailAddress objects. File input conflicts with field assignments.

First-class body commands accept repeatable `--set Path=value`: numbers, booleans, null, objects, and arrays use JSON types; other input is literal text. Empty strings and null remain distinct from omitted fields. The provider defines whether a supplied empty string or null clears a field; no implicit removal is applied. Dotted paths cannot contain prototype keys. Scalar options cannot repeat. Unsupported flags and extra arguments fail before requests. Both `--name value` and `--name=value` work; `--` ends option parsing.

Read filters use repeatable `--query name=value` with exact provider names and literal values. Unknown CLI options never become API fields. For first-class paginated commands, use `--page-size` and `--cursor` instead of count/offset query fields.

Date filters retain their provider contract; the CLI performs no timezone conversion. Message-search dates accept Postmark's ISO 8601 date/date-time syntax, including explicit offsets. Use an explicit offset when timezone matters; a date-only or offset-free value is interpreted by Postmark, not by your machine. Suppression fromdate/todate boundaries are inclusive. Message and statistics boundary/timezone details are provider-owned, and this CLI does not normalize them. See the linked endpoint reference before combining filters.

## Pagination

Paginated reads fetch one page by default, with count 100 and offset 0. `--page-size` accepts 1..500. `--all` traverses pages, and `--max-items` bounds that traversal while preserving the next unread offset in `meta.next_cursor`. Ordering comes from Postmark and can change if the underlying collection changes.

Outbound/inbound message search and open search enforce the provider's 10,000 count-plus-offset limit. At a provider cap, `meta.has_more` stays true, `meta.truncated` is true, and `next_cursor` is null; narrow the filters. Streams, webhooks, and suppression lists do not expose offset pagination and reject those flags.

Automatic retries are disabled, a documented `CLI-RETRY-1` SHOULD exception (see [CLI conventions](docs/cli-conventions.md)). Explicit request counts help callers reason about writes whose outcomes are unknown. A retryable error does not mean retrying a mutation is safe.

## Errors

Errors use the selected output format on stderr. Structured errors contain code, message, retryable, and provider status/code/request ID when available. Exit codes are 0 success, 1 unexpected/provider response failure, 2 input, 3 configuration/authentication, 4 permission, 5 missing resource, 6 conflict, 7 transient/network, 8 partial, 9 confirmation, and 130 interruption.

## Raw API

```bash
postmark api request GET /server --auth server
postmark api request GET /servers --auth account --query count=10 --query offset=0
postmark api request PUT /server --auth server --file request.json --dry-run
```

Supported methods are GET, HEAD, OPTIONS, POST, PUT, PATCH, and DELETE. Authentication uses the selected Postmark token class. Request bodies use JSON and `--file`; field shorthand is first-class only. Paths remain on the selected origin, and redirects are rejected. Read-only raw methods reject body, confirmation, and dry-run flags.

## Global options

- `--profile`: NAME; selected profile, otherwise POSTMARK_PROFILE or active profile
- `--format`: json|pretty|human; default compact uncolored json
- `--color`: auto|always|never; default auto, presentation formats only
- `--quiet`: -q; suppress notices, preserve results and errors
- `--verbose`: -v; redacted request diagnostics on stderr
- `--no-input`: Never prompt; also enforced for CI and nonterminal stdin
- `--timeout`: DURATION; default 30s, positive ms/s/m, maximum 2147483647ms
- `--help`: -h; local help without authentication or network
- `--version`: Print executable name and version; no short alias

## Commands

| Command | Authentication | Effect |
| --- | --- | --- |
| `postmark emails send` | server | Send a single email. |
| `postmark emails batch-send` | server | Send batch emails. |
| `postmark bulk send` | server | Send bulk emails. |
| `postmark bulk get <bulkRequestId>` | server | Get the status/details of a bulk API request. |
| `postmark bounces delivery-stats get` | server | Get delivery stats. |
| `postmark bounces list` | server | Get bounces. |
| `postmark bounces get <bounceId>` | server | Get a single bounce. |
| `postmark bounces dump get <bounceId>` | server | Get bounce dump. |
| `postmark bounces activate <bounceId>` | server | Activate a bounce. |
| `postmark templates send` | server | Send email with template. |
| `postmark templates batch-send` | server | Send batch with templates. |
| `postmark templates push` | server | Push templates to another server. |
| `postmark templates get <templateIdOrAlias>` | server | Get a template. |
| `postmark templates create` | server | Create a template. |
| `postmark templates update <templateIdOrAlias>` | server | Edit a template. |
| `postmark templates list` | server | List templates. |
| `postmark templates delete <templateIdOrAlias>` | server | Delete a template. |
| `postmark templates validate` | server | Validate a template. |
| `postmark server get` | server | Get the current server. |
| `postmark server update` | server | Edit the current server. |
| `postmark servers list` | account | List servers. |
| `postmark servers get <serverId>` | account | Get a server. |
| `postmark servers create` | account | Create a server. |
| `postmark servers update <serverId>` | account | Edit a server. |
| `postmark servers delete <serverId>` | account | Delete a server. |
| `postmark streams list` | server | List message streams. |
| `postmark streams get <streamId>` | server | Get a message stream. |
| `postmark streams create` | server | Create a message stream. |
| `postmark streams update <streamId>` | server | Edit a message stream. |
| `postmark streams archive <streamId>` | server | Archive a message stream. |
| `postmark streams restore <streamId>` | server | Unarchive a message stream. |
| `postmark messages outbound search` | server | Search outbound messages. |
| `postmark messages outbound get <messageId>` | server | Get outbound message details. |
| `postmark messages outbound export <messageId>` | server | Get outbound message dump. |
| `postmark messages inbound search` | server | Search inbound messages. |
| `postmark messages inbound get <messageId>` | server | Get inbound message details. |
| `postmark messages inbound bypass <messageId>` | server | Bypass rules for a blocked inbound message. |
| `postmark messages inbound retry <messageId>` | server | Retry a failed inbound message for processing. |
| `postmark messages opens search` | server | Search message opens. |
| `postmark messages opens get <messageId>` | server | Get opens for a single message. |
| `postmark messages clicks search` | server | Search message clicks. |
| `postmark messages clicks get <messageId>` | server | Get clicks for a single message. |
| `postmark domains list` | account | List domains. |
| `postmark domains get <domainId>` | account | Get a domain's details. |
| `postmark domains create` | account | Create a domain. |
| `postmark domains update <domainId>` | account | Edit a domain. |
| `postmark domains delete <domainId>` | account | Delete a domain. |
| `postmark domains verify-dkim <domainId>` | account | Verify DKIM status. |
| `postmark domains verify-return-path <domainId>` | account | Verify Return-Path status. |
| `postmark domains verify-spf <domainId>` | account | Verify an SPF record. |
| `postmark domains rotate-dkim <domainId>` | account | Rotate DKIM keys. |
| `postmark signatures list` | account | List sender signatures. |
| `postmark signatures get <signatureId>` | account | Get a sender signature's details. |
| `postmark signatures create` | account | Create a sender signature. |
| `postmark signatures update <signatureId>` | account | Edit a sender signature. |
| `postmark signatures delete <signatureId>` | account | Delete a sender signature. |
| `postmark signatures resend-confirmation <signatureId>` | account | Resend a sender signature confirmation. |
| `postmark signatures verify-spf <signatureId>` | account | Verify sender signature SPF. |
| `postmark signatures request-new-dkim <signatureId>` | account | Request a new DKIM for a sender signature. |
| `postmark stats outbound get --metric overview` | server | Get outbound overview. |
| `postmark stats outbound get --metric sends` | server | Get sent counts. |
| `postmark stats outbound get --metric bounces` | server | Get bounce counts. |
| `postmark stats outbound get --metric spam` | server | Get spam complaints. |
| `postmark stats outbound get --metric tracked` | server | Get tracked email counts. |
| `postmark stats outbound get --metric opens` | server | Get email open counts. |
| `postmark stats outbound get --metric open-platforms` | server | Get email platform usage. |
| `postmark stats outbound get --metric open-clients` | server | Get email client usage. |
| `postmark stats outbound get --metric clicks` | server | Get click counts. |
| `postmark stats outbound get --metric click-browser-families` | server | Get browser usage. |
| `postmark stats outbound get --metric click-platforms` | server | Get browser platform usage. |
| `postmark stats outbound get --metric click-location` | server | Get click location. |
| `postmark inbound-rules list` | server | List inbound rule triggers. |
| `postmark inbound-rules create` | server | Create an inbound rule trigger. |
| `postmark inbound-rules delete <triggerId>` | server | Delete an inbound rule trigger. |
| `postmark webhooks list` | server | List webhooks. |
| `postmark webhooks get <webhookId>` | server | Get a webhook. |
| `postmark webhooks create` | server | Create a webhook. |
| `postmark webhooks update <webhookId>` | server | Edit a webhook. |
| `postmark webhooks delete <webhookId>` | server | Delete a webhook. |
| `postmark suppressions list --message-stream <stream-id>` | server | Dump suppressions for a message stream. |
| `postmark suppressions batch-create --message-stream <stream-id>` | server | Create a suppression for a message stream. |
| `postmark suppressions batch-delete --message-stream <stream-id>` | server | Delete a suppression for a message stream. |
| `postmark data-removals create` | account | Create a Data Removal request. |
| `postmark data-removals get <requestId>` | account | Check a Data Removal request status. |

### Local utilities and raw requests

- `postmark setup [profile]`: Create and activate a local profile; existing profiles require profiles update.
- `postmark profiles list`: List local profiles.
- `postmark profiles get <name>`: Inspect a profile with tokens redacted.
- `postmark profiles create <name>`: Create a local profile.
- `postmark profiles update <name>`: Change supplied local profile fields.
- `postmark profiles delete <name>`: Delete an inactive local profile.
- `postmark profiles use <name>`: Select an existing profile.
- `postmark config list`: Read local configuration.
- `postmark config path`: Show local configuration paths.
- `postmark config get <key>`: Read activeProfile or baseUrl.
- `postmark config set <key> <value>`: Set activeProfile or baseUrl.
- `postmark config unset <key>`: Clear activeProfile or baseUrl.
- `postmark auth verify [--auth account|server]`: Check access to account /servers or current /server; does not prove all permissions.
- `postmark api request <METHOD> <path>`: Send a raw same-origin request; GET, HEAD, OPTIONS, POST, PUT, PATCH, DELETE.
- `postmark bounces types list`: List documented bounce type names locally.
- `postmark bounces rebound-snippet get`: Return the rebound snippet documentation URL.
- `postmark completions bash`: Print Bash completion code; does not edit shell files.
- `postmark completions zsh`: Print Zsh completion code; does not edit shell files.
- `postmark completions fish`: Print Fish completion code; does not edit shell files.

## Specifications and development

`docs/commands.json` records every command contract and shared policies. Help and completion derive from `src/commands.ts` and `src/endpoints.ts`. Completion prints shell code without editing files or requesting network data.

Run `bun run check`, `bun test`, and `bun run build`. No runtime packages are required.

Provider references: [templates](https://postmarkapp.com/developer/api/templates-api), [messages](https://postmarkapp.com/developer/api/messages-api), [streams](https://postmarkapp.com/developer/api/message-streams-api), and [suppressions](https://postmarkapp.com/developer/api/suppressions-api).
