# postmark-cli

A complete command line interface for the Postmark API.

This project intentionally owns the `postmark` binary. It is not the official
Postmark CLI.

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

Profiles live in `~/.config/postmark`.

Token resolution order:

1. `--account-token` / `--server-token`
2. `POSTMARK_ACCOUNT_TOKEN` / `POSTMARK_SERVER_TOKEN`
3. `--profile <name>`
4. active profile

## Examples

```bash
postmark servers list
postmark server update --name "Production" --dry-run
postmark webhooks update 123 --url https://example.com/webhook --yes
postmark api request GET /server
postmark api request PUT /server --set Name=Production --yes
```

Mutation commands require `--yes` or `--dry-run`.

## Generic Input

Every endpoint accepts exact JSON bodies:

```bash
postmark email send --body @email.json --yes
postmark servers update 123 --set Name=Production --yes
```

For `GET` commands, unknown flags become query parameters:

```bash
postmark bounces list --count 50 --offset 0
```

For body commands, unknown flags become PascalCase JSON fields:

```bash
postmark server update --inbound-hook-url https://example.com/inbound --yes
```

is sent as:

```json
{
  "InboundHookUrl": "https://example.com/inbound"
}
```
