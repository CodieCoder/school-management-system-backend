# Error Codes & Handling

## Response Format

Every API response follows a consistent envelope:

**Success:**

```json
{
  "ok": true,
  "data": { ... },
  "errors": [],
  "message": ""
}
```

**Error:**

```json
{
  "ok": false,
  "data": {},
  "errors": [],
  "code": "NOT_FOUND",
  "message": "school not found"
}
```

The `code` field is a machine-readable error constant. Use it for programmatic branching instead of parsing `message`.

---

## Error Code Reference

| Code                | HTTP Status | Description                                      |
| ------------------- | ----------- | ------------------------------------------------ |
| `VALIDATION_ERROR`  | `400`       | Input fails schema validation or business rule    |
| `INVALID_ID`        | `400`       | Malformed ObjectId                                |
| `UNAUTHORIZED`      | `401`       | Missing, invalid, or expired token                |
| `PERMISSION_DENIED` | `403`       | Valid token but insufficient permissions           |
| `NOT_FOUND`         | `404`       | Requested resource does not exist                 |
| `DUPLICATE`         | `409`       | Resource already exists (unique constraint)        |
| `CAPACITY_FULL`     | `422`       | Classroom has reached its enrollment capacity      |
| `BAD_REQUEST`       | `400`       | Generic business logic error (no specific code)    |
| `INTERNAL_ERROR`    | `500`       | Unexpected server failure                          |

---

## HTTP Status Code Summary

| Status | Meaning               | When Used                                                    |
| ------ | --------------------- | ------------------------------------------------------------ |
| `200`  | OK                    | Successful request                                           |
| `400`  | Bad Request           | Validation failure, business rule violation, malformed input |
| `401`  | Unauthorized          | Missing/invalid/expired token, unknown user                  |
| `403`  | Forbidden             | Valid token but no permission for this action                 |
| `404`  | Not Found             | Entity does not exist                                        |
| `409`  | Conflict              | Duplicate resource (email, role name, membership)             |
| `422`  | Unprocessable Entity  | Capacity constraint violation                                 |
| `429`  | Too Many Requests     | Rate limit exceeded                                           |
| `500`  | Internal Server Error | Unexpected failure                                            |

---

## Errors by Category

### Authentication (`UNAUTHORIZED` — 401)

| Message               | Trigger                                          |
| --------------------- | ------------------------------------------------ |
| `token required`      | No `token` header                                |
| `invalid token`       | Token verification failed                        |
| `user not found`      | Valid token but no user profile for this authId   |
| `invalid credentials` | Wrong email or password                          |

### Authorization (`PERMISSION_DENIED` — 403)

| Message                        | Trigger                                            |
| ------------------------------ | -------------------------------------------------- |
| `permission denied`            | User lacks the required permission for this school  |
| `not a member of this school`  | User has no membership for the target school        |

### Validation (`VALIDATION_ERROR` — 400)

| Message                            | Trigger                                      |
| ---------------------------------- | -------------------------------------------- |
| Field-level errors in `errors[]`   | Input fails Pineapple schema validation      |
| `name is required`                 | Empty or missing name field                  |
| `schoolId is required`             | Missing schoolId                             |
| `email, password, and displayName are required` | Missing registration fields     |
| `password must be at least 8 characters`        | Short password                  |

### Not Found (`NOT_FOUND` — 404)

| Message                    | Trigger            |
| -------------------------- | ------------------ |
| `school not found`         | Invalid schoolId   |
| `student not found`        | Invalid studentId  |
| `classroom not found`      | Invalid classroomId|
| `resource not found`       | Invalid resourceId |
| `role not found`           | Invalid roleId     |
| `target school not found`  | Invalid transfer target |
| `membership not found`     | User is not a member    |

### Duplicate (`DUPLICATE` — 409)

| Message                                      | Trigger                              |
| -------------------------------------------- | ------------------------------------ |
| `email already exists`                       | Duplicate email on registration       |
| `student email already exists`               | Duplicate student email in school     |
| `role name already exists in this school`    | Duplicate role name within a school   |
| `classroom name already exists in this school` | Duplicate classroom name            |
| `user is already a member of this school`    | Duplicate SchoolMembership            |

### Capacity (`CAPACITY_FULL` — 422)

| Message                           | Trigger                                     |
| --------------------------------- | ------------------------------------------- |
| `classroom is at full capacity`   | Enrollment or transfer exceeds capacity limit|

### Business Logic (`BAD_REQUEST` — 400)

| Message                                          | Trigger                                         |
| ------------------------------------------------ | ----------------------------------------------- |
| `cannot modify system role`                      | Attempted to update a role with `isSystem: true` |
| `cannot delete system role`                      | Attempted to delete a system role                |
| `cannot delete a role you are currently assigned to` | Caller is assigned to the role being deleted |
| `cannot remove yourself from school`             | Owner trying to remove themselves                |
| `role does not belong to this school`            | Assigning a role from a different school         |
| `invalid permission key: {key}`                  | Permission key not found in registry             |
| `classroom does not belong to this school`       | Cross-school classroom reference                 |
| `cannot transfer to the same school`             | Transfer source and target match                 |
| `student does not belong to this school`         | Cross-school student reference                   |

### Route Errors (`BAD_REQUEST` — 400)

| Message                                              | Trigger                              |
| ---------------------------------------------------- | ------------------------------------ |
| `module {name} not found`                            | Invalid module in URL                |
| `unsupported method {method} for {module}`           | Wrong HTTP method                    |
| `unable to find function {fn} with method {method}`  | Function not in `httpExposed`        |

### Rate Limit (429)

| Message                                        | Trigger              |
| ---------------------------------------------- | -------------------- |
| `too many requests, please try again later`    | Rate limit exceeded  |

### Server Errors (`INTERNAL_ERROR` — 500)

| Message                      | Trigger                                |
| ---------------------------- | -------------------------------------- |
| `{fnName} failed to execute` | Uncaught exception in manager method   |
| `internal server error`      | Uncaught express middleware error       |
