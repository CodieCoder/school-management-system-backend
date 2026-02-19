# Authentication & Authorization Flow — Phase 1

## Overview

Authentication is **decoupled** via an adapter pattern (local JWT or Supabase). Authorization uses **per-school dynamic roles** — a user can own multiple schools and hold different roles at each.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Auth Layer (swappable)                  │
│   ┌────────────────────┐    ┌─────────────────────────┐  │
│   │   Local Adapter    │ OR │   Supabase Adapter      │  │
│   │   (bcrypt + JWT)   │    │   (@supabase/supabase-js)│  │
│   └─────────┬──────────┘    └────────────┬────────────┘  │
└─────────────┼────────────────────────────┼───────────────┘
              │         returns authId      │
              ▼                             ▼
┌──────────────────────────────────────────────────────────┐
│                    User Profile                          │
│           _id, authId, displayName                       │
└────────────────────────┬─────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  SchoolMemberships  │
              │  userId + schoolId  │──► Role (permissions[])
              │  + roleId           │
              └─────────────────────┘
```

---

## Auth Adapter Interface

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `register` | `{ email, password }` | `{ authId, email }` | Create identity |
| `login` | `{ email, password }` | `{ authId, email, token }` | Verify credentials |
| `verifyToken` | `{ token }` | `{ authId, email }` or `null` | Decode and validate token |
| `deleteUser` | `{ authId }` | `{ success }` | Remove identity |

### Adapter Selection

```
AUTH_PROVIDER=local    # or "supabase"
```

---

## Authentication Flows

### Login

```
POST /api/auth/login  { email, password }

1. Auth adapter verifies credentials → { authId, token }
2. Load user profile by authId
3. Load all memberships (with roles populated)
4. Return { user, memberships, token }
```

### Register (requires `user:create` or superadmin)

```
POST /api/auth/register  { email, password, displayName }

1. Auth adapter creates identity → { authId }
2. Create user profile { authId, displayName }
3. Return { user, token }
```

Note: Registration creates a user with **no memberships**. They must be invited to a school separately.

---

## Authorization Flow

### The `__auth` Middleware

Single middleware for all authenticated endpoints:

1. Extract `token` from headers
2. Call `authAdapter.verifyToken({ token })` → `{ authId }`
3. Load user by `authId`
4. Load all SchoolMemberships for user (populate roleId)
5. Inject into request:

```javascript
{
  userId:      "64a...",
  authId:      "...",
  displayName: "John",
  memberships: [
    { schoolId: "64b...", roleName: "owner", permissions: ["*:*"] },
    { schoolId: "64c...", roleName: "teacher", permissions: ["student:read"] }
  ],
  isSuper: false  // true if user has a global superadmin role
}
```

### Permission Checking in Managers

Each manager method:
1. Determines which school the request targets (from `schoolId` param or resource lookup)
2. Finds the user's membership for that school
3. Checks if the membership's permissions satisfy the required permission

```javascript
async createSchool({ __auth, name, address }) {
    // Global permission check (superadmin or user:create)
    if (!this.roleService.hasGlobalPermission(__auth, 'school:create')) {
        return { error: 'permission denied' };
    }
    // ... create school, auto-assign owner role
}

async updateSchool({ __auth, schoolId, name }) {
    // School-scoped permission check
    if (!this.roleService.hasPermission(__auth, schoolId, 'school:update')) {
        return { error: 'permission denied' };
    }
    // ... update school
}
```

### Permission Matching Rules

```
can(userPermissions, requiredPermission):
  1. Exact match:     "school:update" === "school:update"  ✓
  2. Resource wild:   "school:*" covers "school:update"    ✓
  3. Global wild:     "*:*" covers everything               ✓
```

### Superadmin Bypass

Users with a **global** SchoolMembership (schoolId: null, role: superadmin) bypass all school-scoped checks.

---

## Dynamic Roles Flow

### School Creation

```
1. User calls POST /api/school/createSchool { name }
2. School created in DB
3. "owner" Role auto-created for this school (permissions: ["*:*"], isSystem: true)
4. SchoolMembership auto-created: { userId, schoolId, roleId: ownerRole._id }
5. Return school + membership
```

### Creating Custom Roles (school owner)

```
1. School owner calls POST /api/role/createRole
   { schoolId, name: "teacher", permissions: ["student:read", "classroom:read"] }
2. Validate all permission keys exist in Permission registry
3. Role created with schoolId set
4. Return role
```

### Inviting Users to a School

```
1. School owner calls POST /api/school/addMember
   { schoolId, userId, roleId }
2. Validate role belongs to the same school
3. SchoolMembership created
4. User can now act on that school with the assigned role
```

---

## Environment Variables

### Local Adapter

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_PROVIDER` | yes | `local` |
| `LONG_TOKEN_SECRET` | yes | JWT signing secret |
| `SHORT_TOKEN_SECRET` | yes | JWT signing secret |

### Supabase Adapter

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_PROVIDER` | yes | `supabase` |
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role key |
