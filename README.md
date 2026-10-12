# postmark-cli

Command-line interface for the Postmark API. It sends email and templates, manages servers, domains, sender signatures, message streams, webhooks, inbound rules, and suppressions, reads bounces, messages, and statistics, and sends raw API requests. It is not an official Postmark product.

## Install

Requires Node.js 22 or newer.

```bash
npm install -g @zakiaziz/postmark-cli
bun add -g @zakiaziz/postmark-cli
cd postmark-cli && bun run build && bun link
```

## Quick start

```bash
postmark setup
# List the most recent bounces as a table.
postmark bounces list --page-size 20 --format human
# Search outbound messages sent to one recipient.
postmark messages outbound search --query recipient=user@example.com
# Preview deleting a template without sending the request.
postmark templates delete welcome-email --dry-run
```

## Commands

### bounces

| Command | Description | Options |
| --- | --- | --- |
| postmark bounces list | List bounces. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark bounces get BOUNCE_ID | Get one bounce. | --query KEY=VALUE |
| postmark bounces activate BOUNCE_ID | Reactivate the address of a bounce. | --yes, --dry-run |
| postmark bounces delivery-stats get | Get delivery and bounce counts for the server. | --query KEY=VALUE |
| postmark bounces dump get BOUNCE_ID | Get the raw source of a bounce. | --query KEY=VALUE |
| postmark bounces rebound-snippet get | Get the documentation URL of the rebound snippet. | None |
| postmark bounces types list | List the bounce type names. | None |

### data-removals

| Command | Description | Options |
| --- | --- | --- |
| postmark data-removals get REQUEST_ID | Get the status of a data removal request. | --query KEY=VALUE |
| postmark data-removals create | Create a data removal request. | --file PATH, --yes, --dry-run |

### domains

| Command | Description | Options |
| --- | --- | --- |
| postmark domains list | List domains. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark domains get DOMAIN_ID | Get one domain. | --query KEY=VALUE |
| postmark domains create | Create a domain. | --file PATH, --yes, --dry-run |
| postmark domains update DOMAIN_ID | Update a domain. | --file PATH, --yes, --dry-run |
| postmark domains delete DOMAIN_ID | Delete a domain. | --yes, --dry-run |
| postmark domains verify-dkim DOMAIN_ID | Verify the DKIM record of a domain. | --yes, --dry-run |
| postmark domains verify-return-path DOMAIN_ID | Verify the Return-Path record of a domain. | --yes, --dry-run |
| postmark domains verify-spf DOMAIN_ID | Verify the SPF record of a domain. | --yes, --dry-run |
| postmark domains rotate-dkim DOMAIN_ID | Rotate the DKIM keys of a domain. | --yes, --dry-run |

### emails

| Command | Description | Options |
| --- | --- | --- |
| postmark emails send | Send one email. | --file PATH, --yes, --dry-run |
| postmark emails batch-send | Send up to 500 emails in one request. | --file PATH, --yes, --dry-run |
| postmark emails bulk get BULK_REQUEST_ID | Get the status of a bulk email request. | --query KEY=VALUE |
| postmark emails bulk send | Start a bulk email request. | --file PATH, --yes, --dry-run |

### inbound-rules

| Command | Description | Options |
| --- | --- | --- |
| postmark inbound-rules list | List inbound rule triggers. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark inbound-rules create | Create an inbound rule trigger. | --file PATH, --yes, --dry-run |
| postmark inbound-rules delete TRIGGER_ID | Delete an inbound rule trigger. | --yes, --dry-run |

### messages

| Command | Description | Options |
| --- | --- | --- |
| postmark messages clicks list MESSAGE_ID | List the clicks of one message. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark messages clicks search | Search message clicks. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark messages inbound get MESSAGE_ID | Get the details of an inbound message. | --query KEY=VALUE |
| postmark messages inbound search | Search inbound messages. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark messages inbound bypass MESSAGE_ID | Bypass the rules that blocked an inbound message. | --yes, --dry-run |
| postmark messages inbound retry MESSAGE_ID | Retry a failed inbound message. | --yes, --dry-run |
| postmark messages opens list MESSAGE_ID | List the opens of one message. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark messages opens search | Search message opens. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark messages outbound get MESSAGE_ID | Get the details of an outbound message. | --query KEY=VALUE |
| postmark messages outbound search | Search outbound messages. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark messages outbound export MESSAGE_ID | Export the raw source of an outbound message. | --query KEY=VALUE |

### server

| Command | Description | Options |
| --- | --- | --- |
| postmark server get | Get the current server. | --query KEY=VALUE |
| postmark server update | Update the current server. | --file PATH, --yes, --dry-run |

### servers

| Command | Description | Options |
| --- | --- | --- |
| postmark servers list | List servers. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark servers get SERVER_ID | Get one server. | --query KEY=VALUE |
| postmark servers create | Create a server. | --file PATH, --yes, --dry-run |
| postmark servers update SERVER_ID | Update a server. | --file PATH, --yes, --dry-run |
| postmark servers delete SERVER_ID | Delete a server. | --yes, --dry-run |

### signatures

| Command | Description | Options |
| --- | --- | --- |
| postmark signatures list | List sender signatures. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark signatures get SIGNATURE_ID | Get one sender signature. | --query KEY=VALUE |
| postmark signatures create | Create a sender signature. | --file PATH, --yes, --dry-run |
| postmark signatures update SIGNATURE_ID | Update a sender signature. | --file PATH, --yes, --dry-run |
| postmark signatures delete SIGNATURE_ID | Delete a sender signature. | --yes, --dry-run |
| postmark signatures resend-confirmation SIGNATURE_ID | Resend the confirmation email of a sender signature. | --yes, --dry-run |
| postmark signatures verify-spf SIGNATURE_ID | Verify the SPF record of a sender signature. | --yes, --dry-run |
| postmark signatures request-new-dkim SIGNATURE_ID | Request a new DKIM key for a sender signature. | --yes, --dry-run |

### stats

| Command | Description | Options |
| --- | --- | --- |
| postmark stats outbound get | Get outbound statistics for one metric. | --metric METRIC, --query KEY=VALUE |

### streams

| Command | Description | Options |
| --- | --- | --- |
| postmark streams list | List message streams. | --query KEY=VALUE |
| postmark streams get STREAM_ID | Get one message stream. | --query KEY=VALUE |
| postmark streams create | Create a message stream. | --file PATH, --yes, --dry-run |
| postmark streams update STREAM_ID | Update a message stream. | --file PATH, --yes, --dry-run |
| postmark streams archive STREAM_ID | Archive a message stream. | --yes, --dry-run |
| postmark streams restore STREAM_ID | Restore an archived message stream. | --yes, --dry-run |

### suppressions

| Command | Description | Options |
| --- | --- | --- |
| postmark suppressions list | List the suppressions of a message stream. | --message-stream ID, --query KEY=VALUE |
| postmark suppressions batch-create | Suppress up to 50 addresses in a message stream. | --message-stream ID, --file PATH, --yes, --dry-run |
| postmark suppressions batch-delete | Remove up to 50 suppressions from a message stream. | --message-stream ID, --file PATH, --yes, --dry-run |

### templates

| Command | Description | Options |
| --- | --- | --- |
| postmark templates list | List templates. | --query KEY=VALUE, --page-size N, --cursor TOKEN, --all, --max-items N |
| postmark templates get TEMPLATE_ID_OR_ALIAS | Get one template. | --query KEY=VALUE |
| postmark templates create | Create a template. | --file PATH, --yes, --dry-run |
| postmark templates update TEMPLATE_ID_OR_ALIAS | Update a template. | --file PATH, --yes, --dry-run |
| postmark templates delete TEMPLATE_ID_OR_ALIAS | Delete a template. | --yes, --dry-run |
| postmark templates send | Send one email from a template. | --file PATH, --yes, --dry-run |
| postmark templates push | Push templates to another server. | --file PATH, --yes, --dry-run |
| postmark templates validate | Validate a template and render a test. | --file PATH |
| postmark templates batch-send | Send up to 500 emails from templates in one request. | --file PATH, --yes, --dry-run |

### webhooks

| Command | Description | Options |
| --- | --- | --- |
| postmark webhooks list | List webhooks. | --query KEY=VALUE |
| postmark webhooks get WEBHOOK_ID | Get one webhook. | --query KEY=VALUE |
| postmark webhooks create | Create a webhook. | --file PATH, --yes, --dry-run |
| postmark webhooks update WEBHOOK_ID | Update a webhook. | --file PATH, --yes, --dry-run |
| postmark webhooks delete WEBHOOK_ID | Delete a webhook. | --yes, --dry-run |

### setup

| Command | Description | Options |
| --- | --- | --- |
| postmark setup [NAME] | Create and activate a profile. | --account-token-file PATH, --server-token-file PATH, --base-url URL, --default-message-stream ID, --from-env |

### profiles

| Command | Description | Options |
| --- | --- | --- |
| postmark profiles list | List saved profiles. | None |
| postmark profiles get NAME | Get one saved profile with secrets redacted. | None |
| postmark profiles create NAME | Create a profile without activating it. | --account-token-file PATH, --server-token-file PATH, --base-url URL, --default-message-stream ID |
| postmark profiles update NAME | Update fields of a profile. | --account-token-file PATH, --server-token-file PATH, --base-url URL, --default-message-stream ID, --clear-base-url, --clear-default-message-stream |
| postmark profiles delete NAME | Delete a profile. | None |
| postmark profiles use NAME | Make a profile the active profile. | None |

### config

| Command | Description | Options |
| --- | --- | --- |
| postmark config list | List every configuration key. | None |
| postmark config get KEY | Get one configuration value. | None |
| postmark config set KEY VALUE | Set one configuration value. | None |
| postmark config unset KEY | Remove one configuration value. | None |
| postmark config path | Get the configuration paths. | None |

### auth

| Command | Description | Options |
| --- | --- | --- |
| postmark auth verify | Verify the account token or server token. | --token-type TOKEN_TYPE |

### api

| Command | Description | Options |
| --- | --- | --- |
| postmark api request METHOD PATH | Send a raw API request. | --query KEY=VALUE, --file PATH, --yes, --dry-run, --token-type TOKEN_TYPE |

### completions

| Command | Description | Options |
| --- | --- | --- |
| postmark completions SHELL | Print a shell completion script. | None |

## Global options

| Option | Description |
| --- | --- |
| -h, --help | Show help. Uses no credentials or network. |
| --version | Print the executable name and version. |
| --profile NAME | Select a saved profile. |
| --format FORMAT | Output format. Allowed: json, pretty, human. Default: json. |
| --color WHEN | Color for pretty and human output. Allowed: auto, always, never. Default: auto. |
| -q, --quiet | Suppress progress and notices. Results and errors still print. |
| -v, --verbose | Print redacted diagnostics to stderr. |
| --no-input | Never prompt. Fail when input is missing. |
| --timeout DURATION | Per-request timeout in ms, s, or m, from 1ms to 10m. Default: 30s. |

Network commands (the resource commands, `auth verify`, and `api request`) accept every option except `--version`. Local commands (`setup`, `profiles`, and `config`) accept `--help`, `--format`, `--color`, `--quiet`, `--verbose`, and `--no-input`. `completions` accepts only `--help`. With no command, only `--help`, `--version`, `--verbose`, and `--quiet` apply, and `--version` with a command word fails.

## Authentication

Postmark uses two token types, and the CLI treats each as its own credential. A server token (`X-Postmark-Server-Token`) sends email and manages one server. An account token (`X-Postmark-Account-Token`) manages servers, domains, sender signatures, and data removals, and pushes templates between servers. Each command sends only the token it needs: `servers`, `domains`, `signatures`, `data-removals`, and `templates push` commands use the account token, and every other resource command uses the server token. Supply only the tokens you use. A command fails with `AUTHENTICATION_REQUIRED` when its token is missing. `api request` takes a required `--token-type account|server` option that names the token to send. `auth verify` takes the same option to check one token, and without it checks every token you have supplied.

```bash
postmark setup work --account-token-file ./postmark-account-token.txt --server-token-file ./postmark-server-token.txt
postmark auth verify --token-type server
postmark auth verify --token-type account
postmark auth verify
```

`setup [NAME]` creates a profile (default name: `default`) and makes it the active profile. It fails when the profile exists. If activation fails after the profile is written, the profile stays saved and `setup` exits 8 with `PARTIAL_FAILURE`. In a terminal without `--no-input`, `setup` prompts for each token with hidden input when you supply none, and a blank answer skips that token. It needs at least one token. Secrets are never command-line values: pass `--account-token-file PATH` and `--server-token-file PATH` (`-` reads stdin), set `POSTMARK_ACCOUNT_TOKEN` and `POSTMARK_SERVER_TOKEN`, or enter the tokens at the prompt. `setup --from-env` copies `POSTMARK_ACCOUNT_TOKEN`, `POSTMARK_SERVER_TOKEN`, `POSTMARK_BASE_URL`, and `POSTMARK_DEFAULT_MESSAGE_STREAM` into the profile and cannot be combined with the token file options, `--base-url`, or `--default-message-stream`.

| Variable | Purpose |
| --- | --- |
| `POSTMARK_PROFILE` | Select a saved profile. |
| `POSTMARK_ACCOUNT_TOKEN` | Postmark account token. |
| `POSTMARK_SERVER_TOKEN` | Postmark server token. |
| `POSTMARK_BASE_URL` | API base URL. Default: `https://api.postmarkapp.com`. |
| `POSTMARK_DEFAULT_MESSAGE_STREAM` | Message stream that `suppressions` commands use when `--message-stream` is absent. |
| `XDG_CONFIG_HOME` | Configuration root when it is an absolute path. Otherwise `~/.config`. |
| `NO_COLOR` | Disables color with `--color auto` when set and nonempty. |
| `CI` | Disables prompts when nonempty and not `0` or `false`. |

A `POSTMARK_` variable that is set but empty, a malformed `POSTMARK_PROFILE`, and an invalid `POSTMARK_BASE_URL` fail with `CONFIGURATION_ERROR` and name the variable. None of them falls through to the next source.

Precedence:

1. Profile selection: `--profile`, `POSTMARK_PROFILE`, then `activeProfile` in `config.json`. A selected or active profile that does not exist fails with `CONFIGURATION_ERROR`, with no fallback.
2. Credentials: the environment variables, then the selected profile. The first source that supplies any token is the source for both, so a token the environment lacks is not read from the profile. A command whose token that source lacks fails with `AUTHENTICATION_REQUIRED`.
3. Base URL: `POSTMARK_BASE_URL`, the selected profile, `baseUrl` in `config.json`, then the default.
4. Default message stream: `POSTMARK_DEFAULT_MESSAGE_STREAM`, the selected profile, `defaultMessageStream` in `config.json`. There is no built-in default. `--message-stream` overrides it.

`postmark auth verify --token-type server` sends `GET /server`. Success proves that Postmark accepted the server token for that read, and `identity` holds the server `ID` and `Name`. `postmark auth verify --token-type account` sends `GET /servers?count=1&offset=0` and proves only that Postmark accepted the account token for that read. Neither proves complete permission coverage. `postmark auth verify` with no option runs the check of every token you have supplied, one request each, and prints one entry per check in `data.checks`, each led by its `token_type`. When some checks pass and others fail, it exits 8 with `PARTIAL_FAILURE`, `error.partial.completed` lists the checks that passed and `error.partial.failed` lists the failures. When every check fails, it reports the first failure unchanged. With no token at all it fails with `AUTHENTICATION_REQUIRED`.

## Output and errors

The default output format is `json`: one compact, uncolored line on stdout with the envelope `{"data":...,"meta":{...}}`. `--format pretty` prints the same document indented, with syntax highlighting when color applies. `--format human` prints tables for collections and labeled fields for one resource. Errors go to stderr in the selected format. Help, `--version`, and `completions` print plain text.

`data` is an object for one resource, an array for a collection, or `null`, and keeps Postmark's field names. `meta` is always present.

| `meta` key | When |
| --- | --- |
| `next_cursor` | Paginated collection reads. A string, or `null` when no page remains. |
| `has_more` | Paginated collection reads. |
| `provider` | Collection metadata that Postmark returns, such as `TotalCount`. |
| `dry_run`, `validation` | Dry-run previews. `validation` is `local`. |

Errors print one document on stderr, for example `{"error":{"code":"RATE_LIMITED","message":"...","hint":"...","retryable":true,"provider":{"status":429}}}`. Optional keys are `hint`, `outcome` (`unknown` when a mutation may have applied), `provider` (`status`, `code`, `request_id`, `retry_after_seconds`), `details`, and `partial`. `provider.code` holds the Postmark `ErrorCode` as a string. `--format human` prints `Error [CODE]: message` and `Hint: ...`.

| Exit | Error codes |
| --- | --- |
| 0 | Success, including empty collections. |
| 1 | `UNEXPECTED_ERROR`, `PROVIDER_ERROR`, `INVALID_RESPONSE`, `UNSUPPORTED_RESPONSE` |
| 2 | `INVALID_ARGUMENT`, `INVALID_REQUEST` |
| 3 | `CONFIGURATION_ERROR`, `AUTHENTICATION_REQUIRED`, `AUTHENTICATION_FAILED` |
| 4 | `PERMISSION_DENIED` |
| 5 | `NOT_FOUND` |
| 6 | `CONFLICT` |
| 7 | `RATE_LIMITED`, `TRANSIENT_FAILURE` |
| 8 | `PARTIAL_FAILURE` |
| 9 | `CONFIRMATION_REQUIRED`, `CONFIRMATION_DECLINED` |
| 130 | `INTERRUPTED` |

IDs are opaque strings, and each one is sent as a single percent-encoded path segment. Options accept `--name value` and `--name=value`, and `--` ends options. Unknown commands, options, extra arguments, invalid values, and conflicting options fail with exit code 2 before any request. Complete request bodies come only from `--file PATH` (`-` reads stdin), and provider filters on reads come from the repeatable `--query KEY=VALUE`. Postmark answers HTTP 200 for the suppression batch commands even when single addresses fail, so check the `Status` and `Message` of every item in `data`. `emails batch-send` and `templates batch-send` also get HTTP 200 with one result per message, but they fail the command: when Postmark rejects any message (nonzero `ErrorCode`), the command exits 8 with `PARTIAL_FAILURE`, and `error.partial.completed` and `error.partial.failed` list each message by its position and recipient. Nothing is rolled back, so send only the failed messages again.

Mutations (every command with `--yes` and `--dry-run`, and `api request` with `POST`, `PUT`, `PATCH`, or `DELETE`) need confirmation. The CLI validates arguments first, then resolves credentials (exit 3 when missing), then asks for confirmation. In a terminal, it shows the profile, operation, request, and effect, then prompts. `--yes` confirms without a prompt. With `--no-input`, a non-terminal stdin or stderr, or CI mode, a missing confirmation exits 9. Ctrl-C or end of input at a prompt exits 130 with `INTERRUPTED`. `--dry-run` prints a redacted preview of the request and sends nothing. It needs no credentials. Preview success does not guarantee that the request succeeds. `templates validate` is a read: it sends a POST that changes nothing, so it takes no `--yes` or `--dry-run`.

Reads make up to 3 attempts on HTTP 429, 500, 502, 503, 504, network errors, and timeouts, waiting 250 ms, then 500 ms, or the `Retry-After` value up to 10 seconds. A `Retry-After` above 10 seconds is not waited on: the command fails with `RATE_LIMITED` and `provider.retry_after_seconds`. Mutations make one attempt. `--timeout` applies to each attempt. `--verbose` writes redacted request, response, and retry diagnostics to stderr.

Server and webhook responses print as Postmark returns them, including `ApiTokens` and webhook credentials. Previews, diagnostics, `profiles get`, and `config list` stay redacted.

## Pagination

Paginated commands fetch one page by default. `--page-size` accepts 1 to 500 and defaults to 100. Postmark pages by offset, so `--cursor TOKEN` is the decimal offset of the first unread item, and `meta.next_cursor` is that offset as a string. Postmark sets the order and does not document it. `meta.provider.TotalCount` holds the total when Postmark reports it.

`--all` follows every page. `--max-items N` (with `--all`) shrinks the last request so the read stops on a page boundary, and `meta.next_cursor` resumes it. `--cursor TOKEN` resumes from a previous `meta.next_cursor`, with or without `--all`. `--query` rejects `count` and `offset` on paginated commands; use `--page-size` and `--cursor`.

```bash
postmark bounces list --all --max-items 200 > bounces.json
postmark bounces list --all --cursor "$(jq -r '.meta.next_cursor' bounces.json)"
```

`messages outbound search`, `messages inbound search`, and `messages opens search` reject an offset plus count above 10,000. `--cursor` accepts offsets from 0 to 9999 on those commands. Narrow the query with `--query` filters instead of paging further.

A repeated cursor or an oversized page on the first page fails with `INVALID_RESPONSE` and exit 1. A failure on a later page exits 8 with `PARTIAL_FAILURE`. The items read so far are in `error.partial.data`, `error.partial.next_cursor` points at the first unread item, and `error.details.cause` names the underlying error code, such as `INVALID_RESPONSE`. `streams list`, `webhooks list`, and `suppressions list` are unpaginated: Postmark returns the full list.

## Raw API access

```bash
postmark api request GET /server --token-type server
postmark api request GET /servers --token-type account --query count=10 --query offset=0
postmark api request PUT /server --token-type server --file request.json --dry-run
```

Methods: `GET`, `HEAD`, `OPTIONS`, `POST`, `PUT`, `PATCH`, `DELETE`. `PATH` starts with a single `/` and has no scheme, host, query string, fragment, whitespace, or `.` and `..` segments. Add query parameters with the repeatable `--query KEY=VALUE`. `--file PATH` sends a JSON body as `application/json` (`-` reads stdin). `--file`, `--yes`, and `--dry-run` are rejected on `GET`, `HEAD`, and `OPTIONS`. `--token-type account|server` is required and names the token to send, as the `X-Postmark-Account-Token` or `X-Postmark-Server-Token` header. The CLI sends it only to the configured API origin, and redirects fail. JSON responses print as parsed, other text prints as a JSON string, an empty body prints `null`, and binary responses fail with `UNSUPPORTED_RESPONSE`. Non-2xx responses use the same error mapping as other commands.

## Configuration

Files live in `$XDG_CONFIG_HOME/postmark` when `XDG_CONFIG_HOME` is an absolute path, and in `~/.config/postmark` otherwise.

```text
postmark/
  config.json            {"activeProfile": "work", "baseUrl": "https://..."}
  profiles/NAME.json     {"accountToken": "...", "serverToken": "...", "baseUrl": "https://...", "defaultMessageStream": "outbound"}
```

Keys are camelCase. Files use mode `0600`, directories use mode `0700`, and writes are atomic: the CLI creates a temporary file exclusively with mode `0600` in the same directory, then renames it. Reads reject unknown keys and non-object JSON with `CONFIGURATION_ERROR`. Profile names match `^[A-Za-z0-9._-]+$` and are not `.` or `..`. `config.json` keys: `activeProfile` (read-only through `config`; change it with `profiles use`), `baseUrl`, and `defaultMessageStream`. Profile fields: `accountToken`, `serverToken`, `baseUrl`, and `defaultMessageStream`. Secrets are redacted in previews, diagnostics, `profiles get`, and `config list`.

A base URL, from `--base-url`, `config set baseUrl`, `POSTMARK_BASE_URL`, or a stored file, must be an `https` URL (`http` only for `localhost`, `127.0.0.1`, or `::1`) with no credentials, query string, fragment, or path. Values are stored unchanged, and requests go to the URL's origin.

Completion scripts come from `postmark completions bash|zsh|fish` and read only the command registry and local profile names. They complete commands, options, enum values (after `--OPT ` and `--OPT=`), `METHOD`, `SHELL`, and profile names (after `--profile` and for the `NAME` argument of `profiles get|update|delete|use`). They offer nothing after `--` or after an option that takes a free-form value.

## Exceptions

| Rule | Decision | Reason |
| --- | --- | --- |
| `CLI-GRAM-4` | `emails batch-send`, `templates batch-send` | Preserve the Postmark terms "send batch emails" and "send batch with templates". Each is a batch form of the domain action `send`. |
| `CLI-GRAM-4` | `templates push` | Preserves the Postmark term "push templates". |
| `CLI-GRAM-4` | `templates validate` | Preserves the Postmark term "validate a template". It is a read-only POST. |
| `CLI-GRAM-4` | `bounces activate` | Preserves the Postmark term "activate a bounce". |
| `CLI-GRAM-4` | `messages inbound bypass` | Preserves the Postmark term "bypass rules for a blocked inbound message". |
| `CLI-GRAM-4` | `suppressions batch-delete` | Matches `suppressions batch-create` and Postmark's array-based suppression delete. |
| `CLI-GRAM-4` | `domains verify-dkim`, `domains verify-return-path`, `domains verify-spf`, `signatures verify-spf` | Preserve the Postmark terms for verifying DKIM, Return-Path, and SPF records. |
| `CLI-GRAM-4` | `domains rotate-dkim` | Preserves the Postmark term "rotate DKIM". |
| `CLI-GRAM-4` | `signatures resend-confirmation`, `signatures request-new-dkim` | Preserve the Postmark terms "resend" and "request new DKIM". |
| `CLI-BATCH-1` | `suppressions batch-create` and `suppressions batch-delete` exit 0 when Postmark reports failed items. | Postmark answers HTTP 200 with one result per address, and the CLI prints that response unchanged. Check every item's `Status` and `Message`. |
| `CLI-PAGE-3` | At the 10,000 cap, `meta.next_cursor` is `10000`, which `--cursor` rejects. | Postmark offers no continuation past the cap on `messages outbound search`, `messages inbound search`, and `messages opens search`. |
| `CLI-CFG-4` | Server responses print `ApiTokens` unredacted. | `server get`, `server update`, `servers list`, `servers get`, `servers create`, and `servers update` return the server resource, which contains its API tokens. Previews, diagnostics, `profiles get`, and `config list` stay redacted. |
| `CLI-CFG-4` | Webhook responses print authentication credentials and custom header values unredacted. | `webhooks list`, `webhooks get`, `webhooks create`, and `webhooks update` return the webhook resource as Postmark stores it. Previews and diagnostics stay redacted. |

## Development

```bash
bun run build
bun run check
bun link
```

`src/core/` is vendored from cli-core and is never edited here. Change cli-core and run its sync script instead. `docs/cli-conventions.md` restates the command-line contract this tool follows.

## API references

- [Email API](https://postmarkapp.com/developer/api/email-api)
- [Bulk API](https://postmarkapp.com/developer/api/bulk-email)
- [Bounce API](https://postmarkapp.com/developer/api/bounce-api)
- [Templates API](https://postmarkapp.com/developer/api/templates-api)
- [Messages API](https://postmarkapp.com/developer/api/messages-api)
- [Message Streams API](https://postmarkapp.com/developer/api/message-streams-api)
- [Servers API](https://postmarkapp.com/developer/api/servers-api)
- [Domains API](https://postmarkapp.com/developer/api/domains-api)
- [Sender Signatures API](https://postmarkapp.com/developer/api/signatures-api)
- [Stats API](https://postmarkapp.com/developer/api/stats-api)
- [Inbound rules](https://postmarkapp.com/developer/api/inbound-rules-triggers-api)
- [Webhooks API](https://postmarkapp.com/developer/api/webhooks-api)
- [Suppressions API](https://postmarkapp.com/developer/api/suppressions-api)
- [Data Removals API](https://postmarkapp.com/developer/api/data-removals-api)

