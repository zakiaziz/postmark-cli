import type { Endpoint } from "./types.js";

export const endpoints: Endpoint[] = [
  {
    "name": "emails send",
    "pattern": [
      "emails",
      "send"
    ],
    "method": "POST",
    "path": "/email",
    "auth": "server",
    "mutation": true,
    "description": "Send a single email.",
    "docs": "https://postmarkapp.com/developer/api/email-api"
  },
  {
    "name": "emails batch-send",
    "pattern": [
      "emails",
      "batch-send"
    ],
    "method": "POST",
    "path": "/email/batch",
    "auth": "server",
    "mutation": true,
    "description": "Send batch emails.",
    "docs": "https://postmarkapp.com/developer/api/email-api"
  },
  {
    "name": "bulk send",
    "pattern": [
      "bulk",
      "send"
    ],
    "method": "POST",
    "path": "/email/bulk",
    "auth": "server",
    "mutation": true,
    "description": "Send bulk emails.",
    "docs": "https://postmarkapp.com/developer/api/bulk-email"
  },
  {
    "name": "bulk get",
    "pattern": [
      "bulk",
      "get",
      ":bulkRequestId"
    ],
    "method": "GET",
    "path": "/email/bulk/:bulkRequestId",
    "auth": "server",
    "description": "Get the status/details of a bulk API request.",
    "docs": "https://postmarkapp.com/developer/api/bulk-email"
  },
  {
    "name": "bounces delivery-stats get",
    "pattern": [
      "bounces",
      "delivery-stats",
      "get"
    ],
    "method": "GET",
    "path": "/deliverystats",
    "auth": "server",
    "description": "Get delivery stats.",
    "docs": "https://postmarkapp.com/developer/api/bounce-api"
  },
  {
    "name": "bounces list",
    "pattern": [
      "bounces",
      "list"
    ],
    "method": "GET",
    "path": "/bounces",
    "auth": "server",
    "description": "Get bounces.",
    "docs": "https://postmarkapp.com/developer/api/bounce-api",
    "collectionKey": "Bounces",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100
    }
  },
  {
    "name": "bounces get",
    "pattern": [
      "bounces",
      "get",
      ":bounceId"
    ],
    "method": "GET",
    "path": "/bounces/:bounceId",
    "auth": "server",
    "description": "Get a single bounce.",
    "docs": "https://postmarkapp.com/developer/api/bounce-api"
  },
  {
    "name": "bounces dump get",
    "pattern": [
      "bounces",
      "dump",
      "get",
      ":bounceId"
    ],
    "method": "GET",
    "path": "/bounces/:bounceId/dump",
    "auth": "server",
    "description": "Get bounce dump.",
    "docs": "https://postmarkapp.com/developer/api/bounce-api"
  },
  {
    "name": "bounces activate",
    "pattern": [
      "bounces",
      "activate",
      ":bounceId"
    ],
    "method": "PUT",
    "path": "/bounces/:bounceId/activate",
    "auth": "server",
    "mutation": true,
    "description": "Activate a bounce.",
    "docs": "https://postmarkapp.com/developer/api/bounce-api"
  },
  {
    "name": "templates send",
    "pattern": [
      "templates",
      "send"
    ],
    "method": "POST",
    "path": "/email/withTemplate",
    "auth": "server",
    "mutation": true,
    "description": "Send email with template.",
    "docs": "https://postmarkapp.com/developer/api/templates-api"
  },
  {
    "name": "templates batch-send",
    "pattern": [
      "templates",
      "batch-send"
    ],
    "method": "POST",
    "path": "/email/batchWithTemplates",
    "auth": "server",
    "mutation": true,
    "description": "Send batch with templates.",
    "docs": "https://postmarkapp.com/developer/api/templates-api"
  },
  {
    "name": "templates push",
    "pattern": [
      "templates",
      "push"
    ],
    "method": "PUT",
    "path": "/templates/push",
    "auth": "server",
    "mutation": true,
    "description": "Push templates to another server.",
    "docs": "https://postmarkapp.com/developer/api/templates-api"
  },
  {
    "name": "templates get",
    "pattern": [
      "templates",
      "get",
      ":templateIdOrAlias"
    ],
    "method": "GET",
    "path": "/templates/:templateIdOrAlias",
    "auth": "server",
    "description": "Get a template.",
    "docs": "https://postmarkapp.com/developer/api/templates-api"
  },
  {
    "name": "templates create",
    "pattern": [
      "templates",
      "create"
    ],
    "method": "POST",
    "path": "/templates",
    "auth": "server",
    "mutation": true,
    "description": "Create a template.",
    "docs": "https://postmarkapp.com/developer/api/templates-api"
  },
  {
    "name": "templates update",
    "pattern": [
      "templates",
      "update",
      ":templateIdOrAlias"
    ],
    "method": "PUT",
    "path": "/templates/:templateIdOrAlias",
    "auth": "server",
    "mutation": true,
    "description": "Edit a template.",
    "docs": "https://postmarkapp.com/developer/api/templates-api"
  },
  {
    "name": "templates list",
    "pattern": [
      "templates",
      "list"
    ],
    "method": "GET",
    "path": "/templates",
    "auth": "server",
    "description": "List templates.",
    "docs": "https://postmarkapp.com/developer/api/templates-api",
    "collectionKey": "Templates",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100
    }
  },
  {
    "name": "templates delete",
    "pattern": [
      "templates",
      "delete",
      ":templateIdOrAlias"
    ],
    "method": "DELETE",
    "path": "/templates/:templateIdOrAlias",
    "auth": "server",
    "mutation": true,
    "description": "Delete a template.",
    "docs": "https://postmarkapp.com/developer/api/templates-api"
  },
  {
    "name": "templates validate",
    "pattern": [
      "templates",
      "validate"
    ],
    "method": "POST",
    "path": "/templates/validate",
    "auth": "server",
    "description": "Validate a template.",
    "docs": "https://postmarkapp.com/developer/api/templates-api"
  },
  {
    "name": "server get",
    "pattern": [
      "server",
      "get"
    ],
    "method": "GET",
    "path": "/server",
    "auth": "server",
    "description": "Get the current server.",
    "docs": "https://postmarkapp.com/developer/api/server-api"
  },
  {
    "name": "server update",
    "pattern": [
      "server",
      "update"
    ],
    "method": "PUT",
    "path": "/server",
    "auth": "server",
    "mutation": true,
    "description": "Edit the current server.",
    "docs": "https://postmarkapp.com/developer/api/server-api"
  },
  {
    "name": "servers list",
    "pattern": [
      "servers",
      "list"
    ],
    "method": "GET",
    "path": "/servers",
    "auth": "account",
    "description": "List servers.",
    "docs": "https://postmarkapp.com/developer/api/servers-api",
    "collectionKey": "Servers",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100
    }
  },
  {
    "name": "servers get",
    "pattern": [
      "servers",
      "get",
      ":serverId"
    ],
    "method": "GET",
    "path": "/servers/:serverId",
    "auth": "account",
    "description": "Get a server.",
    "docs": "https://postmarkapp.com/developer/api/servers-api"
  },
  {
    "name": "servers create",
    "pattern": [
      "servers",
      "create"
    ],
    "method": "POST",
    "path": "/servers",
    "auth": "account",
    "mutation": true,
    "description": "Create a server.",
    "docs": "https://postmarkapp.com/developer/api/servers-api"
  },
  {
    "name": "servers update",
    "pattern": [
      "servers",
      "update",
      ":serverId"
    ],
    "method": "PUT",
    "path": "/servers/:serverId",
    "auth": "account",
    "mutation": true,
    "description": "Edit a server.",
    "docs": "https://postmarkapp.com/developer/api/servers-api"
  },
  {
    "name": "servers delete",
    "pattern": [
      "servers",
      "delete",
      ":serverId"
    ],
    "method": "DELETE",
    "path": "/servers/:serverId",
    "auth": "account",
    "mutation": true,
    "description": "Delete a server.",
    "docs": "https://postmarkapp.com/developer/api/servers-api"
  },
  {
    "name": "streams list",
    "pattern": [
      "streams",
      "list"
    ],
    "method": "GET",
    "path": "/message-streams",
    "auth": "server",
    "description": "List message streams.",
    "docs": "https://postmarkapp.com/developer/api/message-streams-api",
    "collectionKey": "MessageStreams"
  },
  {
    "name": "streams get",
    "pattern": [
      "streams",
      "get",
      ":streamId"
    ],
    "method": "GET",
    "path": "/message-streams/:streamId",
    "auth": "server",
    "description": "Get a message stream.",
    "docs": "https://postmarkapp.com/developer/api/message-streams-api"
  },
  {
    "name": "streams create",
    "pattern": [
      "streams",
      "create"
    ],
    "method": "POST",
    "path": "/message-streams",
    "auth": "server",
    "mutation": true,
    "description": "Create a message stream.",
    "docs": "https://postmarkapp.com/developer/api/message-streams-api"
  },
  {
    "name": "streams update",
    "pattern": [
      "streams",
      "update",
      ":streamId"
    ],
    "method": "PUT",
    "path": "/message-streams/:streamId",
    "auth": "server",
    "mutation": true,
    "description": "Edit a message stream.",
    "docs": "https://postmarkapp.com/developer/api/message-streams-api"
  },
  {
    "name": "streams archive",
    "pattern": [
      "streams",
      "archive",
      ":streamId"
    ],
    "method": "POST",
    "path": "/message-streams/:streamId/archive",
    "auth": "server",
    "mutation": true,
    "description": "Archive a message stream.",
    "docs": "https://postmarkapp.com/developer/api/message-streams-api"
  },
  {
    "name": "streams restore",
    "pattern": [
      "streams",
      "restore",
      ":streamId"
    ],
    "method": "POST",
    "path": "/message-streams/:streamId/unarchive",
    "auth": "server",
    "mutation": true,
    "description": "Unarchive a message stream.",
    "docs": "https://postmarkapp.com/developer/api/message-streams-api"
  },
  {
    "name": "messages outbound search",
    "pattern": [
      "messages",
      "outbound",
      "search"
    ],
    "method": "GET",
    "path": "/messages/outbound",
    "auth": "server",
    "description": "Search outbound messages.",
    "docs": "https://postmarkapp.com/developer/api/messages-api",
    "collectionKey": "Messages",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100,
      "maxOffset": 10000
    }
  },
  {
    "name": "messages outbound get",
    "pattern": [
      "messages",
      "outbound",
      "get",
      ":messageId"
    ],
    "method": "GET",
    "path": "/messages/outbound/:messageId/details",
    "auth": "server",
    "description": "Get outbound message details.",
    "docs": "https://postmarkapp.com/developer/api/messages-api"
  },
  {
    "name": "messages outbound export",
    "pattern": [
      "messages",
      "outbound",
      "export",
      ":messageId"
    ],
    "method": "GET",
    "path": "/messages/outbound/:messageId/dump",
    "auth": "server",
    "description": "Get outbound message dump.",
    "docs": "https://postmarkapp.com/developer/api/messages-api"
  },
  {
    "name": "messages inbound search",
    "pattern": [
      "messages",
      "inbound",
      "search"
    ],
    "method": "GET",
    "path": "/messages/inbound",
    "auth": "server",
    "description": "Search inbound messages.",
    "docs": "https://postmarkapp.com/developer/api/messages-api",
    "collectionKey": "InboundMessages",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100,
      "maxOffset": 10000
    }
  },
  {
    "name": "messages inbound get",
    "pattern": [
      "messages",
      "inbound",
      "get",
      ":messageId"
    ],
    "method": "GET",
    "path": "/messages/inbound/:messageId/details",
    "auth": "server",
    "description": "Get inbound message details.",
    "docs": "https://postmarkapp.com/developer/api/messages-api"
  },
  {
    "name": "messages inbound bypass",
    "pattern": [
      "messages",
      "inbound",
      "bypass",
      ":messageId"
    ],
    "method": "PUT",
    "path": "/messages/inbound/:messageId/bypass",
    "auth": "server",
    "mutation": true,
    "description": "Bypass rules for a blocked inbound message.",
    "docs": "https://postmarkapp.com/developer/api/messages-api"
  },
  {
    "name": "messages inbound retry",
    "pattern": [
      "messages",
      "inbound",
      "retry",
      ":messageId"
    ],
    "method": "PUT",
    "path": "/messages/inbound/:messageId/retry",
    "auth": "server",
    "mutation": true,
    "description": "Retry a failed inbound message for processing.",
    "docs": "https://postmarkapp.com/developer/api/messages-api"
  },
  {
    "name": "messages opens search",
    "pattern": [
      "messages",
      "opens",
      "search"
    ],
    "method": "GET",
    "path": "/messages/outbound/opens",
    "auth": "server",
    "description": "Search message opens.",
    "docs": "https://postmarkapp.com/developer/api/messages-api",
    "collectionKey": "Opens",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100,
      "maxOffset": 10000
    }
  },
  {
    "name": "messages opens get",
    "pattern": [
      "messages",
      "opens",
      "get",
      ":messageId"
    ],
    "method": "GET",
    "path": "/messages/outbound/opens/:messageId",
    "auth": "server",
    "description": "Get opens for a single message.",
    "docs": "https://postmarkapp.com/developer/api/messages-api",
    "collectionKey": "Opens",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100
    }
  },
  {
    "name": "messages clicks search",
    "pattern": [
      "messages",
      "clicks",
      "search"
    ],
    "method": "GET",
    "path": "/messages/outbound/clicks",
    "auth": "server",
    "description": "Search message clicks.",
    "docs": "https://postmarkapp.com/developer/api/messages-api",
    "collectionKey": "Clicks",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100
    }
  },
  {
    "name": "messages clicks get",
    "pattern": [
      "messages",
      "clicks",
      "get",
      ":messageId"
    ],
    "method": "GET",
    "path": "/messages/outbound/clicks/:messageId",
    "auth": "server",
    "description": "Get clicks for a single message.",
    "docs": "https://postmarkapp.com/developer/api/messages-api",
    "collectionKey": "Clicks",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100
    }
  },
  {
    "name": "domains list",
    "pattern": [
      "domains",
      "list"
    ],
    "method": "GET",
    "path": "/domains",
    "auth": "account",
    "description": "List domains.",
    "docs": "https://postmarkapp.com/developer/api/domains-api",
    "collectionKey": "Domains",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100
    }
  },
  {
    "name": "domains get",
    "pattern": [
      "domains",
      "get",
      ":domainId"
    ],
    "method": "GET",
    "path": "/domains/:domainId",
    "auth": "account",
    "description": "Get a domain's details.",
    "docs": "https://postmarkapp.com/developer/api/domains-api"
  },
  {
    "name": "domains create",
    "pattern": [
      "domains",
      "create"
    ],
    "method": "POST",
    "path": "/domains",
    "auth": "account",
    "mutation": true,
    "description": "Create a domain.",
    "docs": "https://postmarkapp.com/developer/api/domains-api"
  },
  {
    "name": "domains update",
    "pattern": [
      "domains",
      "update",
      ":domainId"
    ],
    "method": "PUT",
    "path": "/domains/:domainId",
    "auth": "account",
    "mutation": true,
    "description": "Edit a domain.",
    "docs": "https://postmarkapp.com/developer/api/domains-api"
  },
  {
    "name": "domains delete",
    "pattern": [
      "domains",
      "delete",
      ":domainId"
    ],
    "method": "DELETE",
    "path": "/domains/:domainId",
    "auth": "account",
    "mutation": true,
    "description": "Delete a domain.",
    "docs": "https://postmarkapp.com/developer/api/domains-api"
  },
  {
    "name": "domains verify-dkim",
    "pattern": [
      "domains",
      "verify-dkim",
      ":domainId"
    ],
    "method": "PUT",
    "path": "/domains/:domainId/verifyDkim",
    "auth": "account",
    "mutation": true,
    "description": "Verify DKIM status.",
    "docs": "https://postmarkapp.com/developer/api/domains-api"
  },
  {
    "name": "domains verify-return-path",
    "pattern": [
      "domains",
      "verify-return-path",
      ":domainId"
    ],
    "method": "PUT",
    "path": "/domains/:domainId/verifyReturnPath",
    "auth": "account",
    "mutation": true,
    "description": "Verify Return-Path status.",
    "docs": "https://postmarkapp.com/developer/api/domains-api"
  },
  {
    "name": "domains verify-spf",
    "pattern": [
      "domains",
      "verify-spf",
      ":domainId"
    ],
    "method": "PUT",
    "path": "/domains/:domainId/verifyspf",
    "auth": "account",
    "mutation": true,
    "description": "Verify an SPF record.",
    "docs": "https://postmarkapp.com/developer/api/domains-api"
  },
  {
    "name": "domains rotate-dkim",
    "pattern": [
      "domains",
      "rotate-dkim",
      ":domainId"
    ],
    "method": "PUT",
    "path": "/domains/:domainId/rotatedkim",
    "auth": "account",
    "mutation": true,
    "description": "Rotate DKIM keys.",
    "docs": "https://postmarkapp.com/developer/api/domains-api"
  },
  {
    "name": "signatures list",
    "pattern": [
      "signatures",
      "list"
    ],
    "method": "GET",
    "path": "/senders",
    "auth": "account",
    "description": "List sender signatures.",
    "docs": "https://postmarkapp.com/developer/api/signatures-api",
    "collectionKey": "SenderSignatures",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100
    }
  },
  {
    "name": "signatures get",
    "pattern": [
      "signatures",
      "get",
      ":signatureId"
    ],
    "method": "GET",
    "path": "/senders/:signatureId",
    "auth": "account",
    "description": "Get a sender signature's details.",
    "docs": "https://postmarkapp.com/developer/api/signatures-api"
  },
  {
    "name": "signatures create",
    "pattern": [
      "signatures",
      "create"
    ],
    "method": "POST",
    "path": "/senders",
    "auth": "account",
    "mutation": true,
    "description": "Create a sender signature.",
    "docs": "https://postmarkapp.com/developer/api/signatures-api"
  },
  {
    "name": "signatures update",
    "pattern": [
      "signatures",
      "update",
      ":signatureId"
    ],
    "method": "PUT",
    "path": "/senders/:signatureId",
    "auth": "account",
    "mutation": true,
    "description": "Edit a sender signature.",
    "docs": "https://postmarkapp.com/developer/api/signatures-api"
  },
  {
    "name": "signatures delete",
    "pattern": [
      "signatures",
      "delete",
      ":signatureId"
    ],
    "method": "DELETE",
    "path": "/senders/:signatureId",
    "auth": "account",
    "mutation": true,
    "description": "Delete a sender signature.",
    "docs": "https://postmarkapp.com/developer/api/signatures-api"
  },
  {
    "name": "signatures resend-confirmation",
    "pattern": [
      "signatures",
      "resend-confirmation",
      ":signatureId"
    ],
    "method": "POST",
    "path": "/senders/:signatureId/resend",
    "auth": "account",
    "mutation": true,
    "description": "Resend a sender signature confirmation.",
    "docs": "https://postmarkapp.com/developer/api/signatures-api"
  },
  {
    "name": "signatures verify-spf",
    "pattern": [
      "signatures",
      "verify-spf",
      ":signatureId"
    ],
    "method": "PUT",
    "path": "/senders/:signatureId/verifyspf",
    "auth": "account",
    "mutation": true,
    "description": "Verify sender signature SPF.",
    "docs": "https://postmarkapp.com/developer/api/signatures-api"
  },
  {
    "name": "signatures request-new-dkim",
    "pattern": [
      "signatures",
      "request-new-dkim",
      ":signatureId"
    ],
    "method": "POST",
    "path": "/senders/:signatureId/requestnewdkim",
    "auth": "account",
    "mutation": true,
    "description": "Request a new DKIM for a sender signature.",
    "docs": "https://postmarkapp.com/developer/api/signatures-api"
  },
  {
    "name": "stats outbound overview",
    "pattern": [
      "stats",
      "outbound",
      "overview"
    ],
    "method": "GET",
    "path": "/stats/outbound",
    "auth": "server",
    "description": "Get outbound overview.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound sends",
    "pattern": [
      "stats",
      "outbound",
      "sends"
    ],
    "method": "GET",
    "path": "/stats/outbound/sends",
    "auth": "server",
    "description": "Get sent counts.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound bounces",
    "pattern": [
      "stats",
      "outbound",
      "bounces"
    ],
    "method": "GET",
    "path": "/stats/outbound/bounces",
    "auth": "server",
    "description": "Get bounce counts.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound spam",
    "pattern": [
      "stats",
      "outbound",
      "spam"
    ],
    "method": "GET",
    "path": "/stats/outbound/spam",
    "auth": "server",
    "description": "Get spam complaints.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound tracked",
    "pattern": [
      "stats",
      "outbound",
      "tracked"
    ],
    "method": "GET",
    "path": "/stats/outbound/tracked",
    "auth": "server",
    "description": "Get tracked email counts.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound opens",
    "pattern": [
      "stats",
      "outbound",
      "opens"
    ],
    "method": "GET",
    "path": "/stats/outbound/opens",
    "auth": "server",
    "description": "Get email open counts.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound open-platforms",
    "pattern": [
      "stats",
      "outbound",
      "open-platforms"
    ],
    "method": "GET",
    "path": "/stats/outbound/opens/platforms",
    "auth": "server",
    "description": "Get email platform usage.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound open-clients",
    "pattern": [
      "stats",
      "outbound",
      "open-clients"
    ],
    "method": "GET",
    "path": "/stats/outbound/opens/emailclients",
    "auth": "server",
    "description": "Get email client usage.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound clicks",
    "pattern": [
      "stats",
      "outbound",
      "clicks"
    ],
    "method": "GET",
    "path": "/stats/outbound/clicks",
    "auth": "server",
    "description": "Get click counts.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound click-browser-families",
    "pattern": [
      "stats",
      "outbound",
      "click-browser-families"
    ],
    "method": "GET",
    "path": "/stats/outbound/clicks/browserfamilies",
    "auth": "server",
    "description": "Get browser usage.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound click-platforms",
    "pattern": [
      "stats",
      "outbound",
      "click-platforms"
    ],
    "method": "GET",
    "path": "/stats/outbound/clicks/platforms",
    "auth": "server",
    "description": "Get browser platform usage.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "stats outbound click-location",
    "pattern": [
      "stats",
      "outbound",
      "click-location"
    ],
    "method": "GET",
    "path": "/stats/outbound/clicks/location",
    "auth": "server",
    "description": "Get click location.",
    "docs": "https://postmarkapp.com/developer/api/stats-api"
  },
  {
    "name": "inbound-rules list",
    "pattern": [
      "inbound-rules",
      "list"
    ],
    "method": "GET",
    "path": "/triggers/inboundrules",
    "auth": "server",
    "description": "List inbound rule triggers.",
    "docs": "https://postmarkapp.com/developer/api/inbound-rules-triggers-api",
    "collectionKey": "InboundRules",
    "pagination": {
      "maxPageSize": 500,
      "defaultPageSize": 100
    }
  },
  {
    "name": "inbound-rules create",
    "pattern": [
      "inbound-rules",
      "create"
    ],
    "method": "POST",
    "path": "/triggers/inboundrules",
    "auth": "server",
    "mutation": true,
    "description": "Create an inbound rule trigger.",
    "docs": "https://postmarkapp.com/developer/api/inbound-rules-triggers-api"
  },
  {
    "name": "inbound-rules delete",
    "pattern": [
      "inbound-rules",
      "delete",
      ":triggerId"
    ],
    "method": "DELETE",
    "path": "/triggers/inboundrules/:triggerId",
    "auth": "server",
    "mutation": true,
    "description": "Delete an inbound rule trigger.",
    "docs": "https://postmarkapp.com/developer/api/inbound-rules-triggers-api"
  },
  {
    "name": "webhooks list",
    "pattern": [
      "webhooks",
      "list"
    ],
    "method": "GET",
    "path": "/webhooks",
    "auth": "server",
    "description": "List webhooks.",
    "docs": "https://postmarkapp.com/developer/api/webhooks-api",
    "collectionKey": "Webhooks"
  },
  {
    "name": "webhooks get",
    "pattern": [
      "webhooks",
      "get",
      ":webhookId"
    ],
    "method": "GET",
    "path": "/webhooks/:webhookId",
    "auth": "server",
    "description": "Get a webhook.",
    "docs": "https://postmarkapp.com/developer/api/webhooks-api"
  },
  {
    "name": "webhooks create",
    "pattern": [
      "webhooks",
      "create"
    ],
    "method": "POST",
    "path": "/webhooks",
    "auth": "server",
    "mutation": true,
    "description": "Create a webhook.",
    "docs": "https://postmarkapp.com/developer/api/webhooks-api"
  },
  {
    "name": "webhooks update",
    "pattern": [
      "webhooks",
      "update",
      ":webhookId"
    ],
    "method": "PUT",
    "path": "/webhooks/:webhookId",
    "auth": "server",
    "mutation": true,
    "description": "Edit a webhook.",
    "docs": "https://postmarkapp.com/developer/api/webhooks-api"
  },
  {
    "name": "webhooks delete",
    "pattern": [
      "webhooks",
      "delete",
      ":webhookId"
    ],
    "method": "DELETE",
    "path": "/webhooks/:webhookId",
    "auth": "server",
    "mutation": true,
    "description": "Delete a webhook.",
    "docs": "https://postmarkapp.com/developer/api/webhooks-api"
  },
  {
    "name": "suppressions list",
    "pattern": [
      "suppressions",
      "list"
    ],
    "method": "GET",
    "path": "/message-streams/:streamId/suppressions/dump",
    "auth": "server",
    "description": "Dump suppressions for a message stream.",
    "docs": "https://postmarkapp.com/developer/api/suppressions-api",
    "collectionKey": "Suppressions"
  },
  {
    "name": "suppressions batch-create",
    "pattern": [
      "suppressions",
      "batch-create"
    ],
    "method": "POST",
    "path": "/message-streams/:streamId/suppressions",
    "auth": "server",
    "mutation": true,
    "description": "Create a suppression for a message stream.",
    "docs": "https://postmarkapp.com/developer/api/suppressions-api"
  },
  {
    "name": "suppressions batch-delete",
    "pattern": [
      "suppressions",
      "batch-delete"
    ],
    "method": "POST",
    "path": "/message-streams/:streamId/suppressions/delete",
    "auth": "server",
    "mutation": true,
    "description": "Delete a suppression for a message stream.",
    "docs": "https://postmarkapp.com/developer/api/suppressions-api"
  },
  {
    "name": "data-removals create",
    "pattern": [
      "data-removals",
      "create"
    ],
    "method": "POST",
    "path": "/data-removals",
    "auth": "account",
    "mutation": true,
    "description": "Create a Data Removal request.",
    "docs": "https://postmarkapp.com/developer/api/data-removals-api"
  },
  {
    "name": "data-removals get",
    "pattern": [
      "data-removals",
      "get",
      ":requestId"
    ],
    "method": "GET",
    "path": "/data-removals/:requestId",
    "auth": "account",
    "description": "Check a Data Removal request status.",
    "docs": "https://postmarkapp.com/developer/api/data-removals-api"
  }
];

export function findEndpoint(parts: readonly string[]): { endpoint: Endpoint; params: Record<string, string> } | undefined {
  for (const endpoint of endpoints) {
    const result = matchPattern(endpoint.pattern, parts);
    if (result) {
      return { endpoint, params: result };
    }
  }

  return undefined;
}

function matchPattern(pattern: readonly string[], parts: readonly string[]): Record<string, string> | undefined {
  if (pattern.length !== parts.length) {
    return undefined;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < pattern.length; index += 1) {
    const expected = pattern[index];
    const actual = parts[index];

    if (!expected || !actual) {
      return undefined;
    }

    if (expected.startsWith(":")) {
      params[expected.slice(1)] = actual;
      continue;
    }

    if (expected !== actual) {
      return undefined;
    }
  }

  return params;
}
