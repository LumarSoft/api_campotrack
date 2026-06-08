# Endpoints

All endpoints return JSON. Authenticated routes expect a `Authorization: Bearer <accessToken>` header obtained from `POST /auth/login` or `POST /auth/register`.

Common error envelope (NestJS default):

```json
{ "statusCode": 401, "message": "Unauthorized" }
```

`message` may be an array of strings when produced by the global `ValidationPipe`.

---

## Auth

### POST /auth/register

Creates an account and returns a session token. The first user is always the account owner (ADMIN). Members and producers join through `POST /team/invitations/:token/accept`.

**Auth required:** No

**Request body**

| Field    | Type   | Required | Constraints              |
| -------- | ------ | -------- | ------------------------ |
| name     | string | Yes      | Min length 2             |
| email    | string | Yes      | Valid email              |
| password | string | Yes      | Min length 8             |

```json
{ "name": "Ana Soriano", "email": "ana@example.com", "password": "secret-pass" }
```

**Responses**

`201 Created`

```json
{
  "accessToken": "eyJhbGciOi...",
  "user": { "id": 1, "name": "Ana Soriano", "email": "ana@example.com", "role": "ADMIN" }
}
```

`409 Conflict` — email already registered

```json
{ "statusCode": 409, "message": "There is already an account with this email" }
```

`400 Bad Request` — validation failed

```json
{ "statusCode": 400, "message": ["password must be longer than or equal to 8 characters"] }
```

---

### POST /auth/login

Verifies credentials and returns a session token.

**Auth required:** No

**Request body**

| Field    | Type   | Required | Constraints |
| -------- | ------ | -------- | ----------- |
| email    | string | Yes      | Valid email |
| password | string | Yes      | Not empty   |

```json
{ "email": "ana@example.com", "password": "secret-pass" }
```

**Responses**

`200 OK`

```json
{
  "accessToken": "eyJhbGciOi...",
  "user": { "id": 1, "name": "Ana Soriano", "email": "ana@example.com", "role": "ADMIN" }
}
```

`401 Unauthorized` — invalid credentials

```json
{ "statusCode": 401, "message": "Invalid credentials" }
```

---

### GET /auth/me

Returns the authenticated user for the current token.

**Auth required:** Yes

**Responses**

`200 OK`

```json
{ "id": 1, "name": "Ana Soriano", "email": "ana@example.com", "role": "ADMIN" }
```

`401 Unauthorized` — missing or invalid token

---

### PATCH /auth/profile

Updates the current user's name and/or password.

**Auth required:** Yes

**Request body**

| Field    | Type   | Required | Constraints  |
| -------- | ------ | -------- | ------------ |
| name     | string | No       | Min length 2 |
| password | string | No       | Min length 8 |

```json
{ "name": "Ana S." }
```

**Responses**

`200 OK`

```json
{ "id": 1, "name": "Ana S.", "email": "ana@example.com", "role": "ADMIN" }
```

`401 Unauthorized`

---

## Crops

Catalog readable by any authenticated user; writes require `ADMIN`.

### GET /crops

Lists every crop in the catalog.

**Auth required:** Yes

**Responses**

`200 OK`

```json
[{ "id": 1, "name": "Soja" }, { "id": 2, "name": "Maíz" }]
```

---

### POST /crops

Adds a crop to the catalog.

**Auth required:** Yes (ADMIN)

**Request body**

| Field | Type   | Required | Constraints  |
| ----- | ------ | -------- | ------------ |
| name  | string | Yes      | Min length 2 |

```json
{ "name": "Trigo" }
```

**Responses**

`201 Created`

```json
{ "id": 3, "name": "Trigo" }
```

`403 Forbidden` — non-admin caller

---

### PATCH /crops/:id

Renames a crop.

**Auth required:** Yes (ADMIN)

**Request body**

| Field | Type   | Required | Constraints  |
| ----- | ------ | -------- | ------------ |
| name  | string | Yes      | Min length 2 |

**Responses**

`200 OK`

```json
{ "id": 3, "name": "Trigo pan" }
```

`404 Not Found` — unknown crop

---

### DELETE /crops/:id

Removes a crop. Fails if the crop is referenced by campaigns.

**Auth required:** Yes (ADMIN)

**Responses**

`204 No Content`

`404 Not Found`

---

## Clients

Group of fields. Writes require `ADMIN` or `MEMBER`; producers cannot manage clients.

### GET /clients

Lists clients in the caller's account.

**Auth required:** Yes

**Responses**

`200 OK`

```json
[{ "id": 1, "name": "La Esperanza", "contact": "+54 11 5555-5555", "notes": null }]
```

---

### GET /clients/:id

Returns a single client.

**Auth required:** Yes

**Responses**

`200 OK`

```json
{ "id": 1, "name": "La Esperanza", "contact": "+54 11 5555-5555", "notes": null }
```

`404 Not Found`

---

### POST /clients

Creates a client in the caller's account.

**Auth required:** Yes (ADMIN | MEMBER)

**Request body**

| Field   | Type   | Required | Constraints  |
| ------- | ------ | -------- | ------------ |
| name    | string | Yes      | Min length 2 |
| contact | string | No       | —            |
| notes   | string | No       | —            |

```json
{ "name": "La Esperanza", "contact": "+54 11 5555-5555" }
```

**Responses**

`201 Created`

```json
{ "id": 1, "name": "La Esperanza", "contact": "+54 11 5555-5555", "notes": null }
```

`403 Forbidden` — producer caller

---

### PATCH /clients/:id

Updates a client.

**Auth required:** Yes (ADMIN | MEMBER)

**Request body**

| Field   | Type   | Required | Constraints  |
| ------- | ------ | -------- | ------------ |
| name    | string | No       | Min length 2 |
| contact | string | No       | —            |
| notes   | string | No       | —            |

**Responses**

`200 OK`

```json
{ "id": 1, "name": "La Esperanza S.A.", "contact": "+54 11 5555-5555", "notes": "VIP" }
```

`404 Not Found`

---

### DELETE /clients/:id

Removes a client.

**Auth required:** Yes (ADMIN | MEMBER)

**Responses**

`204 No Content`

`404 Not Found`

---

## Fields

A field aggregate includes its locations and subdivisions. Producers can only read fields they were granted access to.

### GET /fields

Lists fields accessible to the caller.

**Auth required:** Yes

**Responses**

`200 OK`

```json
[{ "id": 1, "name": "Lote Norte", "totalHa": 120.5, "clientIds": [1] }]
```

---

### GET /fields/:id

Returns a field with its locations and subdivisions.

**Auth required:** Yes

**Responses**

`200 OK`

```json
{
  "id": 1,
  "name": "Lote Norte",
  "totalHa": 120.5,
  "clientIds": [1],
  "locations": [{ "id": 10, "locality": "Pergamino", "lat": -33.9, "lng": -60.5, "ha": 120.5 }],
  "subdivisions": [{ "id": 100, "locationId": 10, "name": "A1", "ha": 40 }]
}
```

`404 Not Found`

---

### POST /fields

Creates a field in the caller's account.

**Auth required:** Yes (ADMIN | MEMBER)

**Request body**

| Field     | Type     | Required | Constraints      |
| --------- | -------- | -------- | ---------------- |
| name      | string   | Yes      | Min length 2     |
| totalHa   | number   | Yes      | > 0              |
| clientIds | number[] | No       | Unique integers  |

```json
{ "name": "Lote Norte", "totalHa": 120.5, "clientIds": [1] }
```

**Responses**

`201 Created` — same shape as `GET /fields/:id`

`403 Forbidden` — producer caller

---

### PATCH /fields/:id

Updates a field.

**Auth required:** Yes (ADMIN | MEMBER)

**Request body**

| Field     | Type     | Required | Constraints     |
| --------- | -------- | -------- | --------------- |
| name      | string   | No       | Min length 2    |
| totalHa   | number   | No       | > 0             |
| clientIds | number[] | No       | Unique integers |

**Responses**

`200 OK` — same shape as `GET /fields/:id`

`404 Not Found`

---

### DELETE /fields/:id

Removes a field with its locations and subdivisions.

**Auth required:** Yes (ADMIN | MEMBER)

**Responses**

`204 No Content`

`404 Not Found`

---

### POST /fields/:id/locations

Adds a location to a field.

**Auth required:** Yes (ADMIN | MEMBER)

**Request body**

| Field    | Type   | Required | Constraints   |
| -------- | ------ | -------- | ------------- |
| locality | string | Yes      | Min length 2  |
| lat      | number | No       | Valid lat     |
| lng      | number | No       | Valid lng     |
| ha       | number | Yes      | > 0           |

```json
{ "locality": "Pergamino", "lat": -33.9, "lng": -60.5, "ha": 120.5 }
```

**Responses**

`201 Created` — full field aggregate

`404 Not Found`

---

### DELETE /fields/:id/locations/:locationId

Removes a location from a field.

**Auth required:** Yes (ADMIN | MEMBER)

**Responses**

`200 OK` — full field aggregate

`404 Not Found`

---

### POST /fields/:id/subdivisions

Adds a subdivision to a field. Subdivision area must be coherent with its parent location's `ha`.

**Auth required:** Yes (any authenticated role)

**Request body**

| Field      | Type   | Required | Constraints  |
| ---------- | ------ | -------- | ------------ |
| locationId | number | Yes      | —            |
| name       | string | Yes      | Min length 2 |
| ha         | number | Yes      | > 0          |

```json
{ "locationId": 10, "name": "A1", "ha": 40 }
```

**Responses**

`201 Created` — full field aggregate

`400 Bad Request` — incoherent surface

---

### PATCH /fields/:id/subdivisions/:subdivisionId

Updates a subdivision.

**Auth required:** Yes

**Request body**

| Field      | Type   | Required | Constraints  |
| ---------- | ------ | -------- | ------------ |
| locationId | number | No       | —            |
| name       | string | No       | Min length 2 |
| ha         | number | No       | > 0          |

**Responses**

`200 OK` — full field aggregate

`404 Not Found`

---

### DELETE /fields/:id/subdivisions/:subdivisionId

Removes a subdivision.

**Auth required:** Yes

**Responses**

`200 OK` — full field aggregate

`404 Not Found`

---

## Campaigns

Annual agricultural cycle. Attached to either a whole field or a single subdivision.

### GET /campaigns

Lists campaigns the caller can access. Optional filter by field.

**Auth required:** Yes

**Query**

| Field   | Type   | Required | Constraints |
| ------- | ------ | -------- | ----------- |
| fieldId | number | No       | —           |

**Responses**

`200 OK`

```json
[
  {
    "id": 1,
    "cycle": "23/24",
    "ha": 60,
    "sowingDateEst": "2026-11-01",
    "harvestDateEst": "2027-04-01",
    "crop": { "id": 1, "name": "Soja" },
    "field": { "id": 1, "name": "Lote Norte" },
    "subdivision": null
  }
]
```

---

### GET /campaigns/:id

Returns a single campaign.

**Auth required:** Yes

**Responses**

`200 OK` — same shape as the list item

`404 Not Found`

---

### POST /campaigns

Creates a campaign. Exactly one of `fieldId` or `subdivisionId` should be provided.

**Auth required:** Yes

**Request body**

| Field          | Type   | Required | Constraints   |
| -------------- | ------ | -------- | ------------- |
| fieldId        | number | No\*     | One of the two |
| subdivisionId  | number | No\*     | One of the two |
| cycle          | string | Yes      | Min length 2  |
| cropId         | number | Yes      | —             |
| sowingDateEst  | string | No       | ISO date      |
| harvestDateEst | string | No       | ISO date      |
| ha             | number | Yes      | > 0           |

```json
{ "fieldId": 1, "cycle": "23/24", "cropId": 1, "ha": 60 }
```

**Responses**

`201 Created` — same shape as list item

`400 Bad Request` — invalid field/subdivision or crop

---

### PATCH /campaigns/:id

Updates a campaign.

**Auth required:** Yes

**Request body**

| Field          | Type   | Required | Constraints  |
| -------------- | ------ | -------- | ------------ |
| cycle          | string | No       | Min length 2 |
| cropId         | number | No       | —            |
| sowingDateEst  | string | No       | ISO date     |
| harvestDateEst | string | No       | ISO date     |
| ha             | number | No       | > 0          |

**Responses**

`200 OK` — same shape as list item

`403 Forbidden` — caller cannot edit (admin > member rule)

`404 Not Found`

---

### DELETE /campaigns/:id

Removes a campaign.

**Auth required:** Yes

**Responses**

`204 No Content`

`403 Forbidden` | `404 Not Found`

---

## Events

Agronomic calendar events. The admin > member edit rule applies (members can only edit their own events).

### GET /events

Lists events for a date range and/or scope.

**Auth required:** Yes

**Query**

| Field      | Type   | Required | Constraints                       |
| ---------- | ------ | -------- | --------------------------------- |
| from       | string | No       | ISO date                          |
| to         | string | No       | ISO date                          |
| fieldId    | number | No       | —                                 |
| campaignId | number | No       | —                                 |
| type       | string | No       | `EventType` enum                  |

**Responses**

`200 OK`

```json
[
  {
    "id": 1,
    "type": "FUMIGACION",
    "plannedDate": "2026-12-01T00:00:00.000Z",
    "actualDate": null,
    "status": "PLANNED",
    "overdue": false,
    "suggestedBySystem": false,
    "note": null,
    "creatorRole": "MEMBER",
    "campaign": { "id": 1, "cycle": "23/24", "cropName": "Soja", "fieldId": 1, "fieldName": "Lote Norte" },
    "subdivision": null,
    "alarms": ["EMAIL"]
  }
]
```

---

### GET /events/:id

Returns a single event.

**Auth required:** Yes

**Responses**

`200 OK` — same shape as list item

`404 Not Found`

---

### POST /events

Creates an event.

**Auth required:** Yes

**Request body**

| Field             | Type     | Required | Constraints                |
| ----------------- | -------- | -------- | -------------------------- |
| campaignId        | number   | Yes      | Must exist in user's scope |
| subdivisionId     | number   | No       | —                          |
| type              | string   | Yes      | `EventType` enum           |
| plannedDate       | string   | Yes      | ISO date                   |
| note              | string   | No       | Max 500 chars              |
| alarms            | string[] | No       | Unique `AlarmType` values  |
| suggestedBySystem | boolean  | No       | Defaults to `false`        |

```json
{ "campaignId": 1, "type": "FUMIGACION", "plannedDate": "2026-12-01", "alarms": ["EMAIL"] }
```

**Responses**

`201 Created` — same shape as list item

`400 Bad Request` — invalid campaign or subdivision

---

### PATCH /events/:id

Updates an event. Setting `status: DONE` without an `actualDate` stamps the event with the current timestamp.

**Auth required:** Yes

**Request body**

| Field       | Type     | Required | Constraints                |
| ----------- | -------- | -------- | -------------------------- |
| type        | string   | No       | `EventType` enum           |
| plannedDate | string   | No       | ISO date                   |
| status      | string   | No       | `EventStatus` enum         |
| actualDate  | string   | No       | ISO date                   |
| note        | string   | No       | Max 500 chars              |
| alarms      | string[] | No       | Unique `AlarmType` values  |

**Responses**

`200 OK` — same shape as list item

`403 Forbidden` | `404 Not Found`

---

### POST /events/:id/postpone

Reschedules an event and records the reason.

**Auth required:** Yes

**Request body**

| Field   | Type   | Required | Constraints                |
| ------- | ------ | -------- | -------------------------- |
| newDate | string | Yes      | ISO date                   |
| cause   | string | Yes      | `PostponementCause` enum   |
| note    | string | No       | Max 500 chars              |

```json
{ "newDate": "2026-12-05", "cause": "WEATHER" }
```

**Responses**

`200 OK` — same shape as list item, with `status: "POSTPONED"`

`403 Forbidden` | `404 Not Found`

---

### DELETE /events/:id

Removes an event.

**Auth required:** Yes

**Responses**

`204 No Content`

`403 Forbidden` | `404 Not Found`

---

## Records

Operational field records (offline-first). Edit/delete follows the admin > member rule.

### GET /records

Lists records visible to the caller.

**Auth required:** Yes

**Query**

| Field          | Type   | Required | Constraints          |
| -------------- | ------ | -------- | -------------------- |
| campaignId     | number | No       | —                    |
| fieldId        | number | No       | —                    |
| subdivisionId  | number | No       | —                    |
| subtype        | string | No       | `RecordSubtype` enum |

**Responses**

`200 OK`

```json
[
  {
    "id": 1,
    "subtype": "FUMIGACION",
    "recordDate": "2026-12-01T00:00:00.000Z",
    "data": { "product": "Glifosato", "doseLPerHa": 2 },
    "photos": [],
    "clientUpdatedAt": null,
    "creatorRole": "MEMBER",
    "createdAt": "2026-12-01T12:30:00.000Z",
    "campaign": { "id": 1, "cycle": "23/24", "cropName": "Soja", "fieldId": 1, "fieldName": "Lote Norte" },
    "subdivision": null
  }
]
```

---

### GET /records/:id

Returns a single record.

**Auth required:** Yes

**Responses**

`200 OK` — same shape as list item

`404 Not Found`

---

### POST /records

Creates a record. The `data` payload is validated against the `subtype` schema.

**Auth required:** Yes

**Request body**

| Field           | Type     | Required | Constraints                          |
| --------------- | -------- | -------- | ------------------------------------ |
| subtype         | string   | Yes      | `RecordSubtype` enum                 |
| campaignId      | number   | Yes      | Must exist in user's scope           |
| subdivisionId   | number   | No       | —                                    |
| recordDate      | string   | Yes      | ISO date                             |
| data            | object   | Yes      | Validated per `subtype`              |
| photos          | string[] | No       | —                                    |
| clientUpdatedAt | string   | No       | ISO date — used for offline LWW sync |

```json
{
  "subtype": "FUMIGACION",
  "campaignId": 1,
  "recordDate": "2026-12-01",
  "data": { "product": "Glifosato", "doseLPerHa": 2 }
}
```

**Responses**

`201 Created` — same shape as list item

`400 Bad Request` — invalid campaign, subdivision, or `data` payload

---

### PATCH /records/:id

Updates a record.

**Auth required:** Yes

**Request body**

| Field           | Type     | Required | Constraints  |
| --------------- | -------- | -------- | ------------ |
| subdivisionId   | number   | No       | —            |
| recordDate      | string   | No       | ISO date     |
| data            | object   | No       | Per subtype  |
| photos          | string[] | No       | —            |
| clientUpdatedAt | string   | No       | ISO date     |

**Responses**

`200 OK` — same shape as list item

`403 Forbidden` | `404 Not Found`

---

### DELETE /records/:id

Removes a record.

**Auth required:** Yes

**Responses**

`204 No Content`

`403 Forbidden` | `404 Not Found`

---

## Team

Member and invitation management. All routes under `/team` require `ADMIN`, except the public invitation flow under `/team/invitations/:token`.

### GET /team/members

Lists members of the caller's account.

**Auth required:** Yes (ADMIN)

**Responses**

`200 OK`

```json
[
  { "id": 2, "name": "Pablo", "email": "pablo@example.com", "role": "MEMBER", "fieldIds": [1, 2] }
]
```

---

### PATCH /team/members/:id

Updates a member's role and/or accessible fields. Cannot promote to ADMIN.

**Auth required:** Yes (ADMIN)

**Request body**

| Field    | Type     | Required | Constraints                |
| -------- | -------- | -------- | -------------------------- |
| role     | string   | No       | `MEMBER` or `PRODUCER`     |
| fieldIds | number[] | No       | Unique integers            |

```json
{ "role": "PRODUCER", "fieldIds": [1] }
```

**Responses**

`200 OK` — same shape as list item

`404 Not Found`

---

### DELETE /team/members/:id

Removes a member from the account.

**Auth required:** Yes (ADMIN)

**Responses**

`204 No Content`

`404 Not Found`

---

### POST /team/invitations

Creates an invitation. The recipient joins by calling `POST /team/invitations/:token/accept`.

**Auth required:** Yes (ADMIN)

**Request body**

| Field    | Type     | Required | Constraints            |
| -------- | -------- | -------- | ---------------------- |
| email    | string   | Yes      | Valid email            |
| role     | string   | Yes      | `MEMBER` or `PRODUCER` |
| fieldIds | number[] | No       | Unique integers        |

```json
{ "email": "nuevo@example.com", "role": "MEMBER", "fieldIds": [1] }
```

**Responses**

`201 Created`

```json
{
  "id": 5,
  "email": "nuevo@example.com",
  "role": "MEMBER",
  "fieldIds": [1],
  "token": "inv_abc123",
  "expiresAt": "2026-06-14T00:00:00.000Z",
  "createdAt": "2026-06-07T20:00:00.000Z"
}
```

---

### GET /team/invitations

Lists pending invitations.

**Auth required:** Yes (ADMIN)

**Responses**

`200 OK` — list of invitations (same shape as above)

---

### DELETE /team/invitations/:id

Revokes a pending invitation.

**Auth required:** Yes (ADMIN)

**Responses**

`204 No Content`

`404 Not Found`

---

### GET /team/invitations/:token

Returns a public preview of an invitation so the invitee can decide whether to accept.

**Auth required:** No

**Responses**

`200 OK`

```json
{ "email": "nuevo@example.com", "role": "MEMBER", "accountOwnerName": "Ana Soriano" }
```

`404 Not Found` — invalid or expired token

---

### POST /team/invitations/:token/accept

Creates the invitee's user, attaches it to the account, and returns a fresh session.

**Auth required:** No

**Request body**

| Field    | Type   | Required | Constraints  |
| -------- | ------ | -------- | ------------ |
| name     | string | Yes      | Min length 2 |
| password | string | Yes      | Min length 8 |

```json
{ "name": "Pablo", "password": "secret-pass" }
```

**Responses**

`201 Created`

```json
{
  "accessToken": "eyJhbGciOi...",
  "user": { "id": 2, "name": "Pablo", "email": "nuevo@example.com", "role": "MEMBER" }
}
```

`404 Not Found` — invalid or expired token

`409 Conflict` — email already in use

---

## Audit

### GET /audit

Lists the audit trail for the caller's account.

**Auth required:** Yes (ADMIN)

**Responses**

`200 OK`

```json
[
  {
    "id": 1,
    "actor": { "id": 2, "name": "Pablo", "role": "MEMBER" },
    "action": "CREATE",
    "entity": "records",
    "entityId": 12,
    "metadata": { "campaignId": 1, "subtype": "FUMIGACION" },
    "createdAt": "2026-06-07T20:00:00.000Z"
  }
]
```

`403 Forbidden` — non-admin caller

---

## Finance

Costs, incomes and manual grain quotes. All routes require `ADMIN` or `MEMBER` (producers cannot see finance).

### GET /finance/costs

Lists costs in scope.

**Auth required:** Yes (ADMIN | MEMBER)

**Query**

| Field      | Type   | Required | Constraints |
| ---------- | ------ | -------- | ----------- |
| fieldId    | number | No       | —           |
| campaignId | number | No       | —           |

**Responses**

`200 OK`

```json
[
  {
    "id": 1,
    "campaignId": 1,
    "category": "INSUMOS",
    "amount": 1500.5,
    "currency": "ARS",
    "date": "2026-12-01T00:00:00.000Z",
    "costType": "FIJO",
    "note": null,
    "creatorRole": "MEMBER",
    "campaign": { "id": 1, "cycle": "23/24", "cropName": "Soja", "fieldId": 1, "fieldName": "Lote Norte" }
  }
]
```

---

### POST /finance/costs

Creates a cost entry.

**Auth required:** Yes (ADMIN | MEMBER)

**Request body**

| Field      | Type   | Required | Constraints              |
| ---------- | ------ | -------- | ------------------------ |
| campaignId | number | Yes      | Must exist in scope      |
| category   | string | Yes      | `CostCategory` enum      |
| amount     | number | Yes      | > 0                      |
| currency   | string | Yes      | `Currency` enum          |
| date       | string | Yes      | ISO date                 |
| costType   | string | No       | `CostType` enum          |
| note       | string | No       | Max 500 chars            |

```json
{ "campaignId": 1, "category": "INSUMOS", "amount": 1500.5, "currency": "ARS", "date": "2026-12-01" }
```

**Responses**

`201 Created` — same shape as list item

`400 Bad Request` — invalid campaign

---

### PATCH /finance/costs/:id

Updates a cost entry.

**Auth required:** Yes (ADMIN | MEMBER)

**Request body**

| Field    | Type   | Required | Constraints         |
| -------- | ------ | -------- | ------------------- |
| category | string | No       | `CostCategory` enum |
| amount   | number | No       | > 0                 |
| currency | string | No       | `Currency` enum     |
| date     | string | No       | ISO date            |
| costType | string | No       | `CostType` enum     |
| note     | string | No       | Max 500 chars       |

**Responses**

`200 OK` — same shape as list item

`403 Forbidden` | `404 Not Found`

---

### DELETE /finance/costs/:id

Removes a cost entry.

**Auth required:** Yes (ADMIN | MEMBER)

**Responses**

`204 No Content`

`403 Forbidden` | `404 Not Found`

---

### GET /finance/incomes

Lists income entries in scope.

**Auth required:** Yes (ADMIN | MEMBER)

**Query**

| Field      | Type   | Required | Constraints |
| ---------- | ------ | -------- | ----------- |
| fieldId    | number | No       | —           |
| campaignId | number | No       | —           |

**Responses**

`200 OK`

```json
[
  {
    "id": 1,
    "campaignId": 1,
    "crop": { "id": 1, "name": "Soja" },
    "quantity": 250.0,
    "unitPrice": 320.5,
    "currency": "USD",
    "date": "2027-04-15T00:00:00.000Z",
    "note": null,
    "creatorRole": "ADMIN",
    "campaign": { "id": 1, "cycle": "23/24", "cropName": "Soja", "fieldId": 1, "fieldName": "Lote Norte" }
  }
]
```

---

### POST /finance/incomes

Creates an income entry.

**Auth required:** Yes (ADMIN | MEMBER)

**Request body**

| Field      | Type   | Required | Constraints         |
| ---------- | ------ | -------- | ------------------- |
| campaignId | number | Yes      | Must exist in scope |
| cropId     | number | Yes      | Must exist          |
| quantity   | number | Yes      | > 0                 |
| unitPrice  | number | Yes      | > 0                 |
| currency   | string | Yes      | `Currency` enum     |
| date       | string | Yes      | ISO date            |
| note       | string | No       | Max 500 chars       |

```json
{ "campaignId": 1, "cropId": 1, "quantity": 250, "unitPrice": 320.5, "currency": "USD", "date": "2027-04-15" }
```

**Responses**

`201 Created` — same shape as list item

`400 Bad Request` — invalid campaign or crop

---

### PATCH /finance/incomes/:id

Updates an income entry.

**Auth required:** Yes (ADMIN | MEMBER)

**Request body**

| Field     | Type   | Required | Constraints     |
| --------- | ------ | -------- | --------------- |
| cropId    | number | No       | Must exist      |
| quantity  | number | No       | > 0             |
| unitPrice | number | No       | > 0             |
| currency  | string | No       | `Currency` enum |
| date      | string | No       | ISO date        |
| note      | string | No       | Max 500 chars   |

**Responses**

`200 OK` — same shape as list item

`403 Forbidden` | `404 Not Found`

---

### DELETE /finance/incomes/:id

Removes an income entry.

**Auth required:** Yes (ADMIN | MEMBER)

**Responses**

`204 No Content`

`403 Forbidden` | `404 Not Found`

---

### GET /finance/quotes

Lists manual grain quotes for the account.

**Auth required:** Yes (ADMIN | MEMBER)

**Responses**

`200 OK`

```json
[
  {
    "id": 1,
    "crop": { "id": 1, "name": "Soja" },
    "price": 350.0,
    "currency": "USD",
    "date": "2026-06-01T00:00:00.000Z",
    "source": "rosario"
  }
]
```

---

### POST /finance/quotes

Adds a manual grain quote for the account.

**Auth required:** Yes (ADMIN | MEMBER)

**Request body**

| Field    | Type   | Required | Constraints              |
| -------- | ------ | -------- | ------------------------ |
| cropId   | number | Yes      | Must exist               |
| price    | number | Yes      | > 0                      |
| currency | string | Yes      | `Currency` enum          |
| date     | string | Yes      | ISO date                 |
| source   | string | No       | Max 60 chars, default `rosario` |

```json
{ "cropId": 1, "price": 350, "currency": "USD", "date": "2026-06-01" }
```

**Responses**

`201 Created` — same shape as list item

`400 Bad Request` — invalid crop

---

### DELETE /finance/quotes/:id

Removes a quote.

**Auth required:** Yes (ADMIN | MEMBER)

**Responses**

`204 No Content`

`404 Not Found`
