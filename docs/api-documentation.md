# API Documentation — Phase 1

## Base URL

```
http://localhost:5111/api
```

Pattern: `/{moduleName}/{fnName}`

---

## Headers

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | POST/PUT |
| `token` | JWT token | Authenticated endpoints |

---

## Standard Response

```json
{ "ok": true,  "data": { ... }, "errors": [], "message": "" }
{ "ok": false, "data": {},      "errors": [], "message": "error description" }
```

---

## Auth

### POST `/auth/login`

**Auth:** None

| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |
| `password` | string | yes |

**Response:**

```json
{
  "ok": true,
  "data": {
    "user": {
      "_id": "64a...",
      "displayName": "John"
    },
    "memberships": [
      {
        "schoolId": "64b...",
        "schoolName": "Springfield Elementary",
        "role": { "name": "owner", "permissions": ["*:*"] }
      }
    ],
    "token": "eyJ..."
  }
}
```

---

### POST `/auth/register`

**Auth:** Token with `user:create` permission (or superadmin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | yes | Account email |
| `password` | string | yes | 8–100 chars |
| `displayName` | string | yes | Profile name |

**Response:**

```json
{
  "ok": true,
  "data": {
    "user": { "_id": "64a...", "displayName": "New User" },
    "token": "eyJ..."
  }
}
```

---

## Users

### GET `/user/getProfile`

Get authenticated user's profile + memberships.

**Auth:** Any token

**Response:**

```json
{
  "ok": true,
  "data": {
    "_id": "64a...",
    "displayName": "John",
    "memberships": [
      {
        "schoolId": "64b...",
        "schoolName": "Springfield Elementary",
        "role": { "name": "owner", "permissions": ["*:*"] }
      }
    ]
  }
}
```

---

## Schools

### POST `/school/createSchool`

Creates a school and auto-assigns the creator as owner.

**Auth:** Token (any authenticated user can create a school)

| Field | Type | Required |
|-------|------|----------|
| `name` | string | yes |
| `address` | string | no |
| `phone` | string | no |

**Response:**

```json
{
  "ok": true,
  "data": {
    "school": { "_id": "64b...", "name": "Springfield Elementary" },
    "membership": { "roleId": "64c...", "roleName": "owner" }
  }
}
```

---

### GET `/school/getSchool`

**Auth:** Token with `school:read` for this school (or superadmin)

| Field | Type | Source |
|-------|------|--------|
| `schoolId` | string | query |

---

### GET `/school/getSchools`

List schools the authenticated user is a member of. Superadmins see all.

**Auth:** Any token

---

### PUT `/school/updateSchool`

**Auth:** Token with `school:update` for this school

| Field | Type | Required |
|-------|------|----------|
| `schoolId` | string | yes |
| `name` | string | no |
| `address` | string | no |
| `phone` | string | no |

---

### DELETE `/school/deleteSchool`

Cascades: removes memberships, school-scoped roles.

**Auth:** Token with `school:delete` for this school

| Field | Type | Required |
|-------|------|----------|
| `schoolId` | string | yes |

---

### POST `/school/addMember`

Invite a user to a school with a role.

**Auth:** Token with `school:manage_members` for this school

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schoolId` | string | yes | Target school |
| `userId` | string | yes | User to add |
| `roleId` | string | yes | Role to assign (must belong to same school) |

---

### DELETE `/school/removeMember`

Remove a user from a school.

**Auth:** Token with `school:manage_members` for this school

| Field | Type | Required |
|-------|------|----------|
| `schoolId` | string | yes |
| `userId` | string | yes |

---

## Roles

### POST `/role/createRole`

Create a custom role for a school.

**Auth:** Token with `school:manage_roles` for this school

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schoolId` | string | yes | School this role belongs to |
| `name` | string | yes | Role name |
| `description` | string | no | Role description |
| `permissions` | string[] | yes | Permission keys from registry |

**Response:**

```json
{
  "ok": true,
  "data": {
    "_id": "64d...",
    "name": "teacher",
    "permissions": ["student:read", "classroom:read"],
    "schoolId": "64b..."
  }
}
```

---

### GET `/role/getRoles`

List roles for a school.

**Auth:** Token with membership in this school

| Field | Type | Source |
|-------|------|--------|
| `schoolId` | string | query |

---

### PUT `/role/updateRole`

Update a custom role's name or permissions.

**Auth:** Token with `school:manage_roles` for this school

| Field | Type | Required |
|-------|------|----------|
| `roleId` | string | yes |
| `name` | string | no |
| `permissions` | string[] | no |

---

### DELETE `/role/deleteRole`

Delete a custom role. Fails if `isSystem: true`. Removes memberships using this role.

**Auth:** Token with `school:manage_roles` for this school

| Field | Type | Required |
|-------|------|----------|
| `roleId` | string | yes |

---

## Permissions

### GET `/permission/getPermissions`

List all available permissions from the registry.

**Auth:** Any token

---

## Endpoint Summary

| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/auth/login` | Public |
| POST | `/auth/register` | `user:create` / superadmin |
| GET | `/user/getProfile` | Authenticated |
| POST | `/school/createSchool` | Authenticated |
| GET | `/school/getSchool` | `school:read` (scoped) |
| GET | `/school/getSchools` | Authenticated |
| PUT | `/school/updateSchool` | `school:update` (scoped) |
| DELETE | `/school/deleteSchool` | `school:delete` (scoped) |
| POST | `/school/addMember` | `school:manage_members` (scoped) |
| DELETE | `/school/removeMember` | `school:manage_members` (scoped) |
| POST | `/role/createRole` | `school:manage_roles` (scoped) |
| GET | `/role/getRoles` | Membership in school |
| PUT | `/role/updateRole` | `school:manage_roles` (scoped) |
| DELETE | `/role/deleteRole` | `school:manage_roles` (scoped) |
| GET | `/permission/getPermissions` | Authenticated |

**(scoped)** = permission checked against user's role for the specific school.
