# postmark-cli

A complete command line interface for the Postmark API.

This project owns the `postmark` binary. It is not the official Postmark CLI.

## Install

```bash
npm install -g @zakiaziz/postmark-cli
```

Local development:

```bash
npm install
npm run build
npm test
npm link
```

## Setup

```bash
postmark setup --profile default
postmark auth verify
```

Profiles live in `~/.config/postmark`. Setup accepts `--account-token`, `--server-token`, `--default-server-id`, `--default-message-stream`, and `--from-env`. Interactive setup prompts for any missing token.

Token resolution order:

1. `--account-token` or `--server-token`
2. `POSTMARK_ACCOUNT_TOKEN` or `POSTMARK_SERVER_TOKEN`
3. The profile selected by `--profile <name>`
4. The active profile

Account API commands require an account token. Server API commands require a server token. `postmark auth verify` checks both and reports each result independently.

## Command Conventions

All API responses are printed as JSON when Postmark returns JSON. Commands marked **Write** require `--yes` (or `--force`) to execute; use `--dry-run` to print the redacted request without sending it.

Every non-GET API command accepts a complete JSON body with `--body @file.json` or `--data @file.json`. It also accepts repeatable `--set Path=value` assignments and command-specific flags. Command-specific body flags are converted from kebab-case to Postmark's PascalCase fields:

```bash
postmark server update --inbound-hook-url https://example.com/inbound --dry-run
```

```json
{
  "InboundHookUrl": "https://example.com/inbound"
}
```

For `GET` commands, command-specific flags become camelCase query parameters. Use repeatable `--query key=value` to preserve an exact API query name:

```bash
postmark bounces list --count 50 --offset 0
postmark messages outbound search --query recipient=user@example.com
```

## Complete Command Reference

### Setup, Profiles, and Configuration

| Command | Description |
| --- | --- |
| `postmark setup [profile] [--profile NAME] [--from-env]` | Create and activate a profile. Accepts account/server tokens and profile defaults. |
| `postmark profiles list` | List profile names and the active profile. |
| `postmark profiles show <name>` | Show a profile with secrets redacted. |
| `postmark profiles create <name> [options]` | Create a profile. |
| `postmark profiles update <name> [options]` | Update a profile. |
| `postmark profiles delete <name>` | Delete a profile. |
| `postmark profiles use <name>` | Make a profile active. |
| `postmark config path` | Show the config directory and config file path. |
| `postmark config show` | Show global configuration with secrets redacted. |
| `postmark config get <key>` | Read a dotted configuration key. |
| `postmark config set <key> <value>` | Set a dotted configuration key. JSON-like values are parsed. |
| `postmark config unset <key>` | Remove a dotted configuration key. |
| `postmark auth verify` | Verify both configured account and server tokens. |
| `postmark auth` | Alias for `auth verify`. |
| `postmark auth verify-account` | Verify only the account token. |
| `postmark auth verify-server` | Verify only the server token. |
| `postmark completions bash` | Print Bash completions. |
| `postmark completions zsh` | Print Zsh completions. |
| `postmark completions fish` | Print Fish completions. |
| `postmark api request <GET\|POST\|PUT\|DELETE> <path>` | Call any Postmark API path. Non-GET methods are writes. |

Profile create/update options are `--account-token`, `--server-token`, `--default-server-id`, `--default-message-stream`, and `--base-url`.

### Email and Bulk Sending

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark email send` | Server | Write | Send one email. |
| `postmark email batch` | Server | Write | Send a batch of emails. |
| `postmark bulk send` | Server | Write | Start a bulk email request. |
| `postmark bulk get <bulkRequestId>` | Server | Read | Get bulk request status and details. |

### Bounces

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark bounces delivery-stats` | Server | Read | Get delivery statistics. |
| `postmark bounces list` | Server | Read | List and filter bounces. |
| `postmark bounces get <bounceId>` | Server | Read | Get one bounce. |
| `postmark bounces dump <bounceId>` | Server | Read | Get a bounce dump. |
| `postmark bounces activate <bounceId>` | Server | Write | Reactivate a bounced address. |
| `postmark bounces types` | None | Read | List documented Postmark bounce type names. |
| `postmark bounces rebound-snippet` | None | Read | Print the rebound JavaScript documentation URL. |

### Templates

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark templates send` | Server | Write | Send an email using a template. |
| `postmark templates batch` | Server | Write | Send a batch using templates. |
| `postmark templates push` | Server | Write | Push templates to another server. |
| `postmark templates get <templateIdOrAlias>` | Server | Read | Get a template by ID or alias. |
| `postmark templates create` | Server | Write | Create a template. |
| `postmark templates update <templateIdOrAlias>` | Server | Write | Update a template by ID or alias. |
| `postmark templates list` | Server | Read | List templates. |
| `postmark templates delete <templateIdOrAlias>` | Server | Write | Delete a template. |
| `postmark templates validate` | Server | Write | Validate template content. |

### Current Server and Servers

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark server get` | Server | Read | Get the current server. |
| `postmark server update` | Server | Write | Update the current server. |
| `postmark servers list` | Account | Read | List servers. |
| `postmark servers get <serverId>` | Account | Read | Get a server. |
| `postmark servers create` | Account | Write | Create a server. |
| `postmark servers update <serverId>` | Account | Write | Update a server. |
| `postmark servers delete <serverId>` | Account | Write | Delete a server. |

### Message Streams

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark streams list` | Server | Read | List message streams. |
| `postmark streams get <streamId>` | Server | Read | Get a message stream. |
| `postmark streams create` | Server | Write | Create a message stream. |
| `postmark streams update <streamId>` | Server | Write | Update a message stream. |
| `postmark streams archive <streamId>` | Server | Write | Archive a message stream. |
| `postmark streams unarchive <streamId>` | Server | Write | Unarchive a message stream. |

### Message Search and Details

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark messages outbound search` | Server | Read | Search outbound messages. |
| `postmark messages outbound details <messageId>` | Server | Read | Get outbound message details. |
| `postmark messages outbound dump <messageId>` | Server | Read | Get an outbound message dump. |
| `postmark messages inbound search` | Server | Read | Search inbound messages. |
| `postmark messages inbound details <messageId>` | Server | Read | Get inbound message details. |
| `postmark messages inbound bypass <messageId>` | Server | Write | Bypass rules for a blocked inbound message. |
| `postmark messages inbound retry <messageId>` | Server | Write | Retry inbound message processing. |
| `postmark messages opens search` | Server | Read | Search message opens. |
| `postmark messages opens get <messageId>` | Server | Read | Get opens for one message. |
| `postmark messages clicks search` | Server | Read | Search message clicks. |
| `postmark messages clicks get <messageId>` | Server | Read | Get clicks for one message. |

### Domains

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark domains list` | Account | Read | List domains. |
| `postmark domains get <domainId>` | Account | Read | Get a domain. |
| `postmark domains create` | Account | Write | Create a domain. |
| `postmark domains update <domainId>` | Account | Write | Update a domain. |
| `postmark domains delete <domainId>` | Account | Write | Delete a domain. |
| `postmark domains verify-dkim <domainId>` | Account | Write | Verify DKIM status. |
| `postmark domains verify-return-path <domainId>` | Account | Write | Verify Return-Path status. |
| `postmark domains verify-spf <domainId>` | Account | Write | Verify an SPF record. |
| `postmark domains rotate-dkim <domainId>` | Account | Write | Rotate DKIM keys. |

### Sender Signatures

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark signatures list` | Account | Read | List sender signatures. |
| `postmark signatures get <signatureId>` | Account | Read | Get a sender signature. |
| `postmark signatures create` | Account | Write | Create a sender signature. |
| `postmark signatures update <signatureId>` | Account | Write | Update a sender signature. |
| `postmark signatures delete <signatureId>` | Account | Write | Delete a sender signature. |
| `postmark signatures resend-confirmation <signatureId>` | Account | Write | Resend signature confirmation. |
| `postmark signatures verify-spf <signatureId>` | Account | Write | Verify sender signature SPF. |
| `postmark signatures request-new-dkim <signatureId>` | Account | Write | Request new DKIM records. |

### Outbound Statistics

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark stats outbound overview` | Server | Read | Get the outbound overview. |
| `postmark stats outbound sends` | Server | Read | Get sent counts. |
| `postmark stats outbound bounces` | Server | Read | Get bounce counts. |
| `postmark stats outbound spam` | Server | Read | Get spam complaint counts. |
| `postmark stats outbound tracked` | Server | Read | Get tracked email counts. |
| `postmark stats outbound opens` | Server | Read | Get open counts. |
| `postmark stats outbound open-platforms` | Server | Read | Get email platform usage. |
| `postmark stats outbound open-clients` | Server | Read | Get email client usage. |
| `postmark stats outbound clicks` | Server | Read | Get click counts. |
| `postmark stats outbound click-browser-families` | Server | Read | Get browser family usage. |
| `postmark stats outbound click-platforms` | Server | Read | Get click platform usage. |
| `postmark stats outbound click-location` | Server | Read | Get click locations. |

### Inbound Rules

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark inbound-rules list` | Server | Read | List inbound rule triggers. |
| `postmark inbound-rules create` | Server | Write | Create an inbound rule trigger. |
| `postmark inbound-rules delete <triggerId>` | Server | Write | Delete an inbound rule trigger. |

### Webhooks

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark webhooks list` | Server | Read | List webhooks. |
| `postmark webhooks get <webhookId>` | Server | Read | Get a webhook. |
| `postmark webhooks create` | Server | Write | Create a webhook. |
| `postmark webhooks update <webhookId>` | Server | Write | Update a webhook. |
| `postmark webhooks delete <webhookId>` | Server | Write | Delete a webhook. |

### Suppressions

Commands without `<streamId>` use `--message-stream <streamId>` or the profile's `defaultMessageStream`.

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark suppressions dump` | Server | Read | Dump suppressions for the default message stream. |
| `postmark suppressions dump <streamId>` | Server | Read | Dump suppressions for a specified message stream. |
| `postmark suppressions create` | Server | Write | Create a suppression in the default message stream. |
| `postmark suppressions create <streamId>` | Server | Write | Create a suppression in a specified message stream. |
| `postmark suppressions delete` | Server | Write | Delete a suppression from the default message stream. |
| `postmark suppressions delete <streamId>` | Server | Write | Delete a suppression from a specified message stream. |

### Data Removals

| Command | Auth | Access | Description |
| --- | --- | --- | --- |
| `postmark data-removals create` | Account | Write | Create a data removal request. |
| `postmark data-removals get <requestId>` | Account | Read | Check a data removal request. |

## Global Options

| Option | Purpose |
| --- | --- |
| `--profile <name>` | Select a saved profile. |
| `--account-token <token>` | Override the account token. |
| `--server-token <token>` | Override the server token. |
| `--auth <account\|server>` | Select auth for `api request`. |
| `--base-url <url>` | Override the Postmark API base URL. |
| `--body <json\|@file>` / `--data <json\|@file>` | Supply an exact JSON request body. |
| `--set Path=value` | Set a request-body field; repeatable and supports dotted paths. |
| `--query key=value` | Set an exact query parameter; repeatable. |
| `--message-stream <streamId>` | Supply a message stream when the command omits one. |
| `--server <serverId>` | Supply a server path default where supported. |
| `--dry-run` | Print a redacted request without sending it. |
| `--yes`, `-y`, `--force` | Confirm a write. |
| `--json` | Accepted output compatibility flag; JSON responses are already printed as JSON. |
| `--help`, `-h` | Show help. |
| `--version`, `-v` | Show the version. |

## Raw API Access

```bash
postmark api request GET /server --auth server
postmark api request GET /servers --auth account --query count=10
postmark api request PUT /server --auth server --set Name=Production --dry-run
postmark api request POST /email --auth server --body @email.json --yes
```

## Development

```bash
npm run check
npm test
npm run build
```

The CLI requires Node.js 20 or newer and has no runtime dependencies.
