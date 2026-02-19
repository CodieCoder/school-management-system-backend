# Database Schema — Phase 1

## Overview

The School Management System uses **MongoDB** with **Mongoose**. Authentication is decoupled via an adapter pattern. Role assignment is **per-school** through a junction entity, enabling users to own multiple schools and hold different roles at each.

**Phase 1 entities:** Permission, Role, User, School, SchoolMembership

---

## Entity Relationship Diagram

```
┌────────────────┐
│  Permissions   │
├────────────────┤
│ key (unique)   │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│ resource       │                                  │ referenced
│ action         │                                  │ by key
│ description    │                                  │
│ category       │                                  │
└────────────────┘                                  │
                                                    ▼
┌────────────────┐      ┌─────────────────────┐    ┌────────────────┐
│     Users      │      │  SchoolMemberships  │    │     Roles      │
├────────────────┤      ├─────────────────────┤    ├────────────────┤
│ _id            │◄─────│ userId              │    │ _id            │
│ authId         │      │ schoolId ──────┐    │┌──►│ name           │
│ displayName    │      │ roleId ────────┼────┘│   │ permissions[]  │
│                │      │                │    │ │   │ schoolId       │
└────────────────┘      └────────────────┼────┘ │   │ isSystem       │
                                         │      │   └────────────────┘
                        ┌────────────────┘      │
                        ▼                       │
                  ┌────────────────┐            │
                  │    Schools     │            │
                  ├────────────────┤            │
                  │ _id            │◄───────────┘
                  │ name           │   (Role.schoolId)
                  │ address        │
                  │ phone          │
                  └────────────────┘
```

---

## Collections

### 1. Permissions

Global registry of all available permissions. Seeded at startup.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `key` | String | yes | Unique identifier (e.g., `school:create`) |
| `resource` | String | yes | Resource name |
| `action` | String | yes | Action verb |
| `description` | String | no | Human-readable description |
| `category` | String | no | UI grouping |

**Indexes:** `key` (unique)

**Phase 1 seed:**

| Key | Description |
|-----|-------------|
| `school:create` | Create new schools |
| `school:read` | View school details |
| `school:update` | Update school information |
| `school:delete` | Delete schools |
| `school:manage_roles` | Create/edit/delete roles for a school |
| `school:manage_members` | Invite/remove users, assign roles |

---

### 2. Roles

Roles can be **global** (`schoolId: null`) or **school-scoped** (`schoolId` set). School owners can create custom roles for their school.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `name` | String | yes | Role name (unique per school) |
| `description` | String | no | Role description |
| `permissions` | [String] | yes | Array of permission keys |
| `schoolId` | ObjectId | no | `null` = global role, set = school-scoped |
| `isSystem` | Boolean | no | `true` = cannot be deleted/renamed |
| `createdAt` | Date | auto | Mongoose timestamp |
| `updatedAt` | Date | auto | Mongoose timestamp |

**Indexes:**
- `schoolId` + `name` (unique compound — no duplicate names within a school)

**Seed (global roles):**

| Name | Permissions | schoolId | isSystem |
|------|-------------|----------|----------|
| `superadmin` | `["*:*"]` | `null` | `true` |

**Auto-created per school (when a school is created):**

| Name | Permissions | isSystem |
|------|-------------|----------|
| `owner` | `["*:*"]` | `true` |

**Wildcard rules:**
- `resource:*` — all actions on a resource
- `*:*` — all permissions (superadmin / owner)

---

### 3. Users

Profile data only. No auth fields, no role, no school.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `authId` | String | yes | Identifier from auth provider |
| `displayName` | String | yes | Profile display name |
| `createdAt` | Date | auto | Mongoose timestamp |
| `updatedAt` | Date | auto | Mongoose timestamp |

**Indexes:** `authId` (unique)

---

### 4. Schools

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `name` | String | yes | School name (3–300 chars) |
| `address` | String | no | Physical address |
| `phone` | String | no | Contact phone |
| `createdAt` | Date | auto | Mongoose timestamp |
| `updatedAt` | Date | auto | Mongoose timestamp |

**Indexes:** `name`

---

### 5. SchoolMemberships

Junction table linking users to schools with a role. One membership per user per school.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | auto | Primary key |
| `userId` | ObjectId | yes | Reference to Users |
| `schoolId` | ObjectId | yes | Reference to Schools |
| `roleId` | ObjectId | yes | Reference to Roles (must be scoped to same school) |
| `createdAt` | Date | auto | Mongoose timestamp |
| `updatedAt` | Date | auto | Mongoose timestamp |

**Indexes:**
- `userId` + `schoolId` (unique compound — one role per user per school)
- `schoolId` (list members of a school)
- `userId` (list schools for a user)

---

## Relationships

| Relationship | Type | Via |
|---|---|---|
| User ↔ School | Many-to-Many | SchoolMembership |
| SchoolMembership → Role | Many-to-One | `roleId` |
| Role → School | Many-to-One | `schoolId` (nullable) |
| Role → Permissions | Embeds keys | `permissions[]` strings |

---

## Data Integrity Rules

- Creating a **school** auto-creates an `owner` role for that school and a membership for the creator
- Deleting a **school** cascades: remove its roles, memberships, and future Phase 2 entities
- A **school-scoped role** can only be assigned to memberships within the same school
- A **system role** (`isSystem: true`) cannot be deleted or renamed
- The `owner` role is auto-created per school and grants `*:*` within that school
- **Superadmin** is a global role (no schoolId) — grants access to everything
- Permission keys in roles should reference valid entries in the Permissions collection

---

## Phase 2 (deferred)

| Entity | Description |
|--------|-------------|
| Classroom | `name, schoolId, capacity, resources[]` |
| Student | `name, email, schoolId, classroomId, enrolledAt` |
