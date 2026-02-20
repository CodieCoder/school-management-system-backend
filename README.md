# School Management System API

A RESTful backend for managing schools, classrooms, and students — built on the [Axion](https://github.com/nickinit/axion) microservice framework with Express, MongoDB, and Redis.

## Features

- **Multi-school ownership** — users can own and belong to multiple schools with different roles
- **Dynamic RBAC** — granular permission system with school-scoped and global roles
- **Decoupled authentication** — adapter pattern supporting local JWT (bcrypt) or external providers
- **Rate limiting** — global and endpoint-specific request throttling
- **Redis auth caching** — resolved user context cached to reduce MongoDB queries
- **Resource management** — track school-wide and classroom-specific resources with status, quantity, and extra data
- **Capacity enforcement** — classroom enrollment limits enforced on create and update
- **Cascade operations** — deleting a school removes its classrooms, students, resources, memberships, and roles

## Tech Stack

| Layer      | Technology            |
| ---------- | --------------------- |
| Runtime    | Node.js               |
| Framework  | Express 4 (via Axion) |
| Database   | MongoDB (Mongoose)    |
| Cache      | Redis (ioredis)       |
| Auth       | JWT + bcrypt          |
| Validation | qantra-pineapple      |
| API Docs   | OpenAPI 3.0 (Swagger) |
| Testing    | Jest + Supertest      |

## Prerequisites

- **Node.js** >= 18
- **MongoDB** (local or Atlas connection string)
- **Redis** running on `localhost:6379` (or provide a custom URL)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/CodieCoder/school-management-system-backend
cd school-management-system-backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
MONGO_URI=mongodb://localhost:27017/axion
REDIS_URI=redis://127.0.0.1:6379
LONG_TOKEN_SECRET=<random-secret>
SHORT_TOKEN_SECRET=<random-secret>
NACL_SECRET=<random-secret>
```

### 3. Start the server

```bash
npm run dev
```

The server starts on `http://localhost:5111`. Interactive API docs are available at `http://localhost:5111/api-docs`.

On first boot it seeds:

- Permission registry (all `resource:action` keys)
- Global `superadmin` role
- Default superadmin account (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from `.env`)

### 4. Run tests

```bash
npm test
```

Runs 118 tests (97 integration + 21 unit) against a separate `axion_test` database (auto-derived from your `MONGO_URI`). Requires Redis running.

## Project Structure

```
├── managers/               # Domain modules (business logic)
│   ├── auth/               # Authentication (adapter pattern)
│   │   ├── adapters/       #   └── local.adapter.js (bcrypt + JWT)
│   │   ├── auth_identity.mongoModel.js
│   │   ├── auth.schema.js
│   │   └── index.js
│   ├── user/               # User profiles
│   ├── school/             # School CRUD + member management
│   ├── classroom/          # Classroom CRUD
│   ├── student/            # Student CRUD + transfers + capacity check
│   ├── resource/           # Resource CRUD (school-wide & classroom-specific)
│   ├── role/               # Role CRUD (dynamic per-school roles)
│   ├── school_membership/  # User ↔ School ↔ Role junction
│   ├── permission/         # Permission registry (seeded)
│   ├── http/               # Express server setup + rate limiting
│   └── api/                # Convention-driven API routing
├── mws/                    # Middleware (auth, token, query, etc.)
├── loaders/                # Bootstrap: managers, models, validators
├── cache/                  # Redis client + cache wrapper
├── connect/                # MongoDB connection
├── config/                 # Environment-based configuration
├── tests/                  # Integration + unit tests
│   └── unit/               #   └── Pure unit tests (no DB)
├── docs/                   # API docs, DB schema, Postman collection
└── static_arch/            # Seed data and system config
```

Each domain module follows the convention:

- `index.js` — Manager class with business logic and `httpExposed` array
- `*.mongoModel.js` — Mongoose schema/model
- `*.schema.js` — Pineapple input validation schema

## API Overview

All endpoints follow the pattern: `POST|GET|PUT|DELETE /api/{module}/{function}`

| Method | Endpoint                         | Auth                    | Description                          |
| ------ | -------------------------------- | ----------------------- | ------------------------------------ |
| POST   | `/api/auth/login`                | Public                  | Login with email/password            |
| POST   | `/api/auth/register`             | `user:create`           | Register a new user                  |
| GET    | `/api/user/getProfile`           | Token                   | Get authenticated user profile       |
| POST   | `/api/school/createSchool`       | Token                   | Create a school (auto-assigns owner) |
| GET    | `/api/school/getSchool`          | `school:read`           | Get school by ID                     |
| GET    | `/api/school/getSchools`         | Token                   | List user's schools                  |
| PUT    | `/api/school/updateSchool`       | `school:update`         | Update school fields                 |
| DELETE | `/api/school/deleteSchool`       | `school:delete`         | Delete school (cascades)             |
| POST   | `/api/school/addMember`          | `school:manage_members` | Add user to school with role         |
| DELETE | `/api/school/removeMember`       | `school:manage_members` | Remove user from school              |
| POST   | `/api/classroom/createClassroom` | `classroom:create`      | Create a classroom                   |
| GET    | `/api/classroom/getClassroom`    | `classroom:read`        | Get classroom by ID                  |
| GET    | `/api/classroom/getClassrooms`   | `classroom:read`        | List classrooms for a school         |
| PUT    | `/api/classroom/updateClassroom` | `classroom:update`      | Update classroom fields              |
| DELETE | `/api/classroom/deleteClassroom` | `classroom:delete`      | Delete a classroom                   |
| POST   | `/api/student/createStudent`     | `student:create`        | Enroll a student                     |
| GET    | `/api/student/getStudent`        | `student:read`          | Get student by ID                    |
| GET    | `/api/student/getStudents`       | `student:read`          | List students for a school           |
| PUT    | `/api/student/updateStudent`     | `student:update`        | Update student fields                |
| POST   | `/api/student/transferStudent`   | `student:transfer`      | Transfer student between schools     |
| DELETE | `/api/student/deleteStudent`     | `student:delete`        | Delete a student                     |
| POST   | `/api/resource/createResource`   | `resource:create`       | Create a resource                    |
| GET    | `/api/resource/getResource`      | `resource:read`         | Get resource by ID                   |
| GET    | `/api/resource/getResources`     | `resource:read`         | List resources for a school          |
| PUT    | `/api/resource/updateResource`   | `resource:update`       | Update resource fields               |
| DELETE | `/api/resource/deleteResource`   | `resource:delete`       | Delete a resource                    |
| POST   | `/api/role/createRole`           | `school:manage_roles`   | Create a custom role                 |
| GET    | `/api/role/getRoles`             | Membership              | List roles for a school              |
| PUT    | `/api/role/updateRole`           | `school:manage_roles`   | Update a role                        |
| DELETE | `/api/role/deleteRole`           | `school:manage_roles`   | Delete a custom role                 |
| GET    | `/api/permission/getPermissions` | Token                   | List all permission keys             |

Full request/response details: [`docs/api-documentation.md`](docs/api-documentation.md)

## Authentication

Requests are authenticated via the `token` header:

```
token: eyJhbGciOiJIUzI1NiIs...
```

The `__auth` middleware resolves the token into a full user context (profile, memberships, permissions) and caches it in Redis for 5 minutes. See [`docs/authentication-flow.md`](docs/authentication-flow.md).

## Rate Limiting

| Scope                | Window     | Max Requests |
| -------------------- | ---------- | ------------ |
| Global (`/api/*`)    | 15 minutes | 100          |
| Auth (`/api/auth/*`) | 15 minutes | 20           |

Responses include standard `RateLimit-*` headers. Exceeding the limit returns `429 Too Many Requests`.

## Docker

```bash
docker compose up
```

Starts the API, MongoDB, and Redis. The API is available at `http://localhost:5111`.

See [`Dockerfile`](Dockerfile) and [`docker-compose.yml`](docker-compose.yml).

## Documentation

| Document                                                                   | Description                          |
| -------------------------------------------------------------------------- | ------------------------------------ |
| [Swagger UI](http://localhost:5111/api-docs)                               | Interactive API explorer (live)      |
| [API Documentation](docs/api-documentation.md)                             | Full endpoint reference              |
| [Authentication Flow](docs/authentication-flow.md)                         | Auth architecture and RBAC           |
| [Database Schema](docs/database-schema.md)                                 | Entity definitions and relationships |
| [Error Codes](docs/error-codes.md)                                         | Error responses and status codes     |
| [Postman Collection](docs/Axion-School-Management.postman_collection.json) | Import into Postman for testing      |

## License

ISC
