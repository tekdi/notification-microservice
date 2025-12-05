# In-App Notifications - API & Integration Guide

This document explains how to use the new in-app notifications in the Notification Service.

## Endpoints

- Create in-app notification (raw or template-based)
  - POST `notification/inApp`
- List notifications with filters and pagination
  - GET `notification/inApp?userId={uuid}&status=unread|read|all&page=1&limit=20`
- Count unread (reuse list with `limit=0`)
  - GET `notification/inApp?userId={uuid}&status=unread&limit=0`
- Mark read (single or all)
  - PATCH `notification/inApp/mark-read`

All endpoints require `Authorization: Bearer <token>` header (Swagger auth key `access-token`).

---

## Create (Raw)

POST `notification/inApp`

Body:
```json
{
  "userId": "c12fa913-6fc1-4e90-bd44-2c75724f2b3c",
  "title": "Task Completed",
  "message": "Your review task is completed.",
  "link": "https://app.example.com/tasks/T-9001",
  "metadata": { "taskId": "T-9001" },
  "tenant_code": "TENANT1",
  "org_code": "ORG1",
  "expiresAt": "2026-01-01T00:00:00.000Z",
  "source": "opportunity-service"
}
```

Notes:
- `title` is required only when neither `templateId` nor `key` is provided.
- `message` (body) is stored empty and rendered dynamically at read/list time from `NotificationActionTemplates` using stored `templateId`/`actionId` and `replacements`.
- Optional fields: `link`, `metadata`, `tenant_code`, `org_code`, `expiresAt`, `source`.

---

## Create (Template-based)

POST `notification/inApp`

Body:
```json
{
  "userId": "c12fa913-6fc1-4e90-bd44-2c75724f2b3c",
  "templateId": "0d3b4b24-8a00-4f1d-9a1c-2f6f1c5f2b11",
  "replacements": {
    "userName": "Sachin",
    "{taskId}": "T-9001"
  },
  "metadata": { "priority": "high" },
  "source": "opportunity-service"
}
```

Rules:
- The template is taken from `NotificationActionTemplates` with `type='inApp'`.
- Placeholders in the template subject/body/link are replaced by `replacements`.
  - Keys can be provided either with braces (`"{userName}"`) or without (`"userName"`).
- If both `templateId` and raw `title/message` are provided, the template takes precedence.

---

## Create (Action-based, consistent with Email/SMS/Push)

POST `notification/inApp`

Body:
```json
{
  "userId": "c12fa913-6fc1-4e90-bd44-2c75724f2b3c",
  "context": "USER",
  "key": "OnRegister",
  "replacements": {
    "userName": "Sachin"
  },
  "metadata": { "role": "superuser" },
  "source": "identity-service"
}
```

Rules:
- We resolve `NotificationActions` by `context` and `key`, then pick the `NotificationActionTemplates` with `type='inApp'`.
- Placeholders are replaced using `replacements`.
- We store `templateId`, `replacements`, `context`, `key`, `actionId` in DB for traceability and re-rendering when listing.

---

## Create (Key-only)

POST `notification/inApp`

Body:
```json
{
  "userId": "c12fa913-6fc1-4e90-bd44-2c75724f2b3c",
  "key": "OnRegister",
  "replacements": { "userName": "Sachin" }
}
```

Rules:
- If `key` resolves to a single action, we use that. If multiple actions share the same key, provide `context` as well.
- We fetch the in-app template for the resolved action and perform placeholder replacement.

---

## Create (Send-structure, bulk over recipients)

POST `notification/inApp`

Curl:
```bash
curl -X POST http://localhost:4000/notification/inApp \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{
    "context":"USER",
    "key":"OnRegister",
    "replacements":{"userName":"Sachin"},
    "inApp": { "receipients": ["<USER_UUID_1>", "<USER_UUID_2>"] }
  }'
```

Behavior:
- For each userId in `inApp.receipients`, the service resolves the action/template and creates an in-app record with `templateId`, `replacements`, etc.
- Response returns `{ inApp: { data: [{recipient, id}, ...] } }`.

## List

GET `notification/inApp?userId={uuid}&status=unread|read|all&page=1&limit=20`

Examples:
```
GET notification/inApp?userId=c12f...&status=unread&page=1&limit=20
GET notification/inApp?userId=c12f...&status=read
GET notification/inApp?userId=c12f...            (defaults to status=all)
```

Response:
```json
{
  "id": "api.send.notification",
  "responseCode": "OK",
  "result": {
    "data": [
      {
        "id": "7f7e6b10-5bdc-4f8b-bf4b-3e4f11a1b2c3",
        "userId": "c12f...",
        "title": "Task Completed",
        "message": "Your review task is completed.",
        "link": "https://app.example.com/tasks/T-9001",
        "metadata": { "taskId": "T-9001" },
        "templateId": "0d3b4b24-8a00-4f1d-9a1c-2f6f1c5f2b11",
        "replacements": {"{taskId}":"T-9001"},
        "isRead": false,
        "createdAt": "2025-12-05T10:30:00.000Z",
        "readAt": null,
        "expiresAt": null,
        "source": "opportunity-service"
      }
    ],
    "count": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

## Count Unread

GET `notification/inApp?userId={uuid}&status=unread&limit=0`

Response:
```json
{
  "id": "api.send.notification",
  "responseCode": "OK",
  "result": { "count": 3 }
}
```

---

## Mark Read

PATCH `notification/inApp/mark-read`

- Mark single:
```json
{ "notificationId": "7f7e6b10-5bdc-4f8b-bf4b-3e4f11a1b2c3" }
```

- Mark all for a user:
```json
{ "userId": "c12fa913-6fc1-4e90-bd44-2c75724f2b3c", "markAll": true }
```

---

## Logging

All in-app operations write to `notificationLogs` for audit:
- Create (raw or template): `type='inApp'`, `action='create'`, `subject=title`, `recipient=userId`
- Mark read (single): `type='inApp'`, `action='mark-read-single'`, body includes notificationId
- Mark read (all): `type='inApp'`, `action='mark-read-all'`, body includes affected count and userId

Use these logs for tracing, analytics, and support.

---

## Kafka Integration (optional)

If you publish to Kafka to create in-app notifications, use the unified service topic:
- `notifications`

Message formats:

1) Raw create (channel discriminator)
```json
{
  "channel": "inApp",
  "userId": "c12fa913-6fc1-4e90-bd44-2c75724f2b3c",
  "title": "Task Completed",
  "message": "Your review task is completed.",
  "link": "https://app.example.com/tasks/T-9001",
  "metadata": { "taskId": "T-9001" },
  "tenant_code": "TENANT1",
  "org_code": "ORG1",
  "expiresAt": "2026-01-01T00:00:00.000Z",
  "source": "opportunity-service",
  "traceId": "d9f7a1a0-6e4f-4a44-a9d0-1234567890ab"
}
```

2) Key-based create (channel discriminator)
```json
{
  "channel": "inApp",
  "userId": "c12fa913-6fc1-4e90-bd44-2c75724f2b3c",
  "key": "OnRegister",
  "context": "USER",
  "replacements": {
    "userName": "Sachin",
    "{taskId}": "T-9001"
  },
  "metadata": { "priority": "high" },
  "source": "opportunity-service",
  "traceId": "d9f7a1a0-6e4f-4a44-a9d0-1234567890ab"
}
```

Consumer handling guideline:
- Validate `userId` (UUID).
- Route by `channel` (e.g., `email`, `sms`, `push`, `inApp`) under the single `notifications` topic.
- Prefer resolving by `key` (and optional `context`) to find `NotificationActions`, then fetch `NotificationActionTemplates` with `type='inApp'`. Render subject/body/link using `replacements`.
- Fallbacks:
  - If only `templateId` exists, render using that.
  - Else require raw `title` and `message`.
- Persist record into `notificationInApp`.
- Optionally write an entry in `notificationLogs` with `type='inApp'`.
- Idempotency suggestion: use `traceId` as a de-duplication key in your consumer if needed.

---

## Migrations

Run migrations (requires DB env vars present):
```bash
npm run migration:run
```

Revert last migration:
```bash
npm run migration:revert
```

Dev tip: to generate a new migration from current models
```bash
npm run migration:generate
```


