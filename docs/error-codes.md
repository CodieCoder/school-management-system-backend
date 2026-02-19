# Error Codes & Handling — Phase 1

## Response Format

```json
{
  "ok": false,
  "data": {},
  "errors": [],
  "message": "Human-readable error description"
}
```

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200` | OK | Successful request |
| `400` | Bad Request | Validation failure, business rule violation |
| `401` | Unauthorized | Missing/invalid/expired token, unknown user |
| `403` | Forbidden | Valid token but no permission for this action at this school |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Duplicate resource |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected failure |

---

## Authentication Errors (401)

| Error | Trigger |
|-------|---------|
| `token required` | No `token` header |
| `invalid token` | Token verification failed |
| `user not found` | Valid token but no user profile for this authId |
| `invalid credentials` | Wrong email or password |

---

## Permission Errors (403)

| Error | Trigger |
|-------|---------|
| `permission denied` | User lacks required permission for this school |
| `not a member of this school` | User has no membership for the target school |

---

## Validation Errors (400)

| Error | Trigger |
|-------|---------|
| Field-level errors in `errors[]` array | Input fails Pineapple schema validation |

---

## Resource Errors (404)

| Error | Trigger |
|-------|---------|
| `school not found` | Invalid schoolId |
| `user not found` | Invalid userId |
| `role not found` | Invalid roleId |
| `membership not found` | User is not a member of the school |

---

## Conflict Errors (409)

| Error | Trigger |
|-------|---------|
| `email already exists` | Duplicate email on registration |
| `role name already exists in this school` | Duplicate role name within a school |
| `user is already a member of this school` | Duplicate SchoolMembership |

---

## Business Logic Errors (400)

| Error | Trigger |
|-------|---------|
| `cannot delete system role` | Attempted to delete a role with `isSystem: true` |
| `cannot remove school owner` | Attempted to remove the owner from their school |
| `role does not belong to this school` | Assigning a role from a different school |
| `invalid permission key` | Permission key not found in registry |
| `cannot delete yourself from school` | Owner trying to remove themselves |

---

## Route Errors

| Error | Trigger |
|-------|---------|
| `module {name} not found` | Invalid module in URL |
| `unsupported method {method} for {module}` | Wrong HTTP method |
| `unable to find function {fn} with method {method}` | Function not in `httpExposed` |

---

## Rate Limit Errors (429)

| Error | Trigger |
|-------|---------|
| `too many requests, please try again later` | Rate limit exceeded |
