const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "School Management System API",
      version: "1.0.0",
      description:
        "RESTful API for managing schools, classrooms, and students with dynamic role-based access control.",
    },
    servers: [{ url: "/api", description: "API base path" }],
    components: {
      securitySchemes: {
        TokenAuth: {
          type: "apiKey",
          in: "header",
          name: "token",
          description: "JWT token returned from /auth/login",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            data: { type: "object" },
            errors: { type: "array", items: { type: "string" } },
            message: { type: "string", example: "error description" },
          },
        },
        School: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            address: { type: "string" },
            phone: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Classroom: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            schoolId: { type: "string" },
            capacity: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Student: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            schoolId: { type: "string" },
            classroomId: { type: "string", nullable: true },
            enrolledAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Role: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            permissions: { type: "array", items: { type: "string" } },
            schoolId: { type: "string", nullable: true },
            isSystem: { type: "boolean" },
          },
        },
        Resource: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            schoolId: { type: "string" },
            classroomId: { type: "string", nullable: true },
            isActive: { type: "boolean" },
            quantity: { type: "integer" },
            description: { type: "string" },
            extraData: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Permission: {
          type: "object",
          properties: {
            _id: { type: "string" },
            key: { type: "string", example: "school:create" },
            resource: { type: "string" },
            action: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
          },
        },
      },
    },
    paths: {
      /* ───── Auth ───── */
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Token + user profile + memberships" },
            400: { description: "Validation error" },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "displayName"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    displayName: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "New user + token" },
            400: { description: "Validation error" },
            401: { description: "Missing or invalid token" },
            409: { description: "Email already exists" },
          },
        },
      },

      /* ───── User ───── */
      "/user/getProfile": {
        get: {
          tags: ["User"],
          summary: "Get authenticated user profile",
          security: [{ TokenAuth: [] }],
          responses: {
            200: { description: "User profile with memberships" },
            401: { description: "Unauthorized" },
          },
        },
      },

      /* ───── Schools ───── */
      "/school/createSchool": {
        post: {
          tags: ["Schools"],
          summary: "Create a school",
          description:
            "Creates a school and auto-assigns the creator as owner.",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                    address: { type: "string" },
                    phone: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "School + owner membership" },
            400: { description: "Validation error" },
          },
        },
      },
      "/school/getSchool": {
        get: {
          tags: ["Schools"],
          summary: "Get a school by ID",
          security: [{ TokenAuth: [] }],
          parameters: [
            {
              name: "schoolId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "School object" },
            403: { description: "Permission denied" },
            404: { description: "Not found" },
          },
        },
      },
      "/school/getSchools": {
        get: {
          tags: ["Schools"],
          summary: "List schools",
          description:
            "Returns schools the user is a member of. Superadmins see all.",
          security: [{ TokenAuth: [] }],
          responses: { 200: { description: "Array of schools" } },
        },
      },
      "/school/getSchoolStats": {
        get: {
          tags: ["Schools"],
          summary: "Get school dashboard stats",
          description:
            "Returns school overview with classroom breakdown, student counts, and capacity utilization via a MongoDB aggregation pipeline.",
          security: [{ TokenAuth: [] }],
          parameters: [
            {
              name: "schoolId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "School stats with per-classroom breakdown",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      totalClassrooms: { type: "integer" },
                      totalStudents: { type: "integer" },
                      unassignedStudents: { type: "integer" },
                      classrooms: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            _id: { type: "string" },
                            name: { type: "string" },
                            capacity: { type: "integer" },
                            studentCount: { type: "integer" },
                            utilization: { type: "number", example: 83.3 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            403: { description: "Permission denied" },
            404: { description: "Not found" },
          },
        },
      },
      "/school/updateSchool": {
        put: {
          tags: ["Schools"],
          summary: "Update a school",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["schoolId"],
                  properties: {
                    schoolId: { type: "string" },
                    name: { type: "string" },
                    address: { type: "string" },
                    phone: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Updated school" },
            403: { description: "Permission denied" },
            404: { description: "Not found" },
          },
        },
      },
      "/school/deleteSchool": {
        delete: {
          tags: ["Schools"],
          summary: "Delete a school",
          description:
            "Cascades: removes classrooms, students, memberships, and school-scoped roles.",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["schoolId"],
                  properties: { schoolId: { type: "string" } },
                },
              },
            },
          },
          responses: {
            200: { description: "Deleted" },
            403: { description: "Permission denied" },
          },
        },
      },
      "/school/addMember": {
        post: {
          tags: ["Schools"],
          summary: "Add a member to a school",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["schoolId", "userId", "roleId"],
                  properties: {
                    schoolId: { type: "string" },
                    userId: { type: "string" },
                    roleId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Membership created" },
            409: { description: "Already a member" },
          },
        },
      },
      "/school/removeMember": {
        delete: {
          tags: ["Schools"],
          summary: "Remove a member from a school",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["schoolId", "userId"],
                  properties: {
                    schoolId: { type: "string" },
                    userId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Member removed" },
            400: { description: "Cannot remove yourself" },
          },
        },
      },

      /* ───── Classrooms ───── */
      "/classroom/createClassroom": {
        post: {
          tags: ["Classrooms"],
          summary: "Create a classroom",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "schoolId"],
                  properties: {
                    name: { type: "string" },
                    schoolId: { type: "string" },
                    capacity: { type: "integer", default: 30 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Created classroom" },
            400: { description: "Validation error" },
            409: { description: "Duplicate name in school" },
          },
        },
      },
      "/classroom/getClassroom": {
        get: {
          tags: ["Classrooms"],
          summary: "Get a classroom by ID",
          security: [{ TokenAuth: [] }],
          parameters: [
            {
              name: "classroomId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Classroom object" },
            404: { description: "Not found" },
          },
        },
      },
      "/classroom/getClassrooms": {
        get: {
          tags: ["Classrooms"],
          summary: "List classrooms for a school",
          security: [{ TokenAuth: [] }],
          parameters: [
            {
              name: "schoolId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { 200: { description: "Array of classrooms" } },
        },
      },
      "/classroom/updateClassroom": {
        put: {
          tags: ["Classrooms"],
          summary: "Update a classroom",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["classroomId"],
                  properties: {
                    classroomId: { type: "string" },
                    name: { type: "string" },
                    capacity: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Updated classroom" },
            409: { description: "Duplicate name" },
          },
        },
      },
      "/classroom/deleteClassroom": {
        delete: {
          tags: ["Classrooms"],
          summary: "Delete a classroom",
          description: "Unlinks enrolled students (sets classroomId to null).",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["classroomId"],
                  properties: { classroomId: { type: "string" } },
                },
              },
            },
          },
          responses: { 200: { description: "Deleted" } },
        },
      },

      /* ───── Students ───── */
      "/student/createStudent": {
        post: {
          tags: ["Students"],
          summary: "Enroll a student",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "schoolId"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    schoolId: { type: "string" },
                    classroomId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Created student" },
            409: { description: "Duplicate email" },
          },
        },
      },
      "/student/getStudent": {
        get: {
          tags: ["Students"],
          summary: "Get a student by ID",
          security: [{ TokenAuth: [] }],
          parameters: [
            {
              name: "studentId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Student object" },
            404: { description: "Not found" },
          },
        },
      },
      "/student/getStudents": {
        get: {
          tags: ["Students"],
          summary: "List students for a school",
          security: [{ TokenAuth: [] }],
          parameters: [
            {
              name: "schoolId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "classroomId",
              in: "query",
              required: false,
              schema: { type: "string" },
            },
          ],
          responses: { 200: { description: "Array of students" } },
        },
      },
      "/student/updateStudent": {
        put: {
          tags: ["Students"],
          summary: "Update a student",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["studentId"],
                  properties: {
                    studentId: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                    classroomId: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Updated student" } },
        },
      },
      "/student/transferStudent": {
        post: {
          tags: ["Students"],
          summary: "Transfer a student to another school",
          description:
            "Moves a student to a new school. Clears classroom assignment.",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["studentId", "newSchoolId"],
                  properties: {
                    studentId: { type: "string" },
                    newSchoolId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Transferred student" },
            400: { description: "Same school or not found" },
          },
        },
      },
      "/student/deleteStudent": {
        delete: {
          tags: ["Students"],
          summary: "Delete a student",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["studentId"],
                  properties: { studentId: { type: "string" } },
                },
              },
            },
          },
          responses: { 200: { description: "Deleted" } },
        },
      },

      /* ───── Resources ───── */
      "/resource/createResource": {
        post: {
          tags: ["Resources"],
          summary: "Create a resource",
          description:
            "Create a school-wide resource (no classroomId) or a classroom-specific resource.",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "schoolId"],
                  properties: {
                    name: { type: "string" },
                    schoolId: { type: "string" },
                    classroomId: {
                      type: "string",
                      nullable: true,
                      description: "null = school-wide",
                    },
                    quantity: { type: "integer", default: 1 },
                    description: { type: "string" },
                    extraData: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Created resource" },
            400: { description: "Validation error" },
          },
        },
      },
      "/resource/getResource": {
        get: {
          tags: ["Resources"],
          summary: "Get a resource by ID",
          security: [{ TokenAuth: [] }],
          parameters: [
            {
              name: "resourceId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Resource object" },
            404: { description: "Not found" },
          },
        },
      },
      "/resource/getResources": {
        get: {
          tags: ["Resources"],
          summary: "List resources for a school",
          description:
            "Filter by classroomId to get classroom-specific resources, or classroomId=null for school-wide only.",
          security: [{ TokenAuth: [] }],
          parameters: [
            {
              name: "schoolId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "classroomId",
              in: "query",
              required: false,
              schema: { type: "string", nullable: true },
            },
          ],
          responses: { 200: { description: "Array of resources" } },
        },
      },
      "/resource/updateResource": {
        put: {
          tags: ["Resources"],
          summary: "Update a resource",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["resourceId"],
                  properties: {
                    resourceId: { type: "string" },
                    name: { type: "string" },
                    classroomId: { type: "string", nullable: true },
                    isActive: { type: "boolean" },
                    quantity: { type: "integer" },
                    description: { type: "string" },
                    extraData: { type: "object" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Updated resource" } },
        },
      },
      "/resource/deleteResource": {
        delete: {
          tags: ["Resources"],
          summary: "Delete a resource",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["resourceId"],
                  properties: { resourceId: { type: "string" } },
                },
              },
            },
          },
          responses: { 200: { description: "Deleted" } },
        },
      },

      /* ───── Roles ───── */
      "/role/createRole": {
        post: {
          tags: ["Roles"],
          summary: "Create a custom role for a school",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["schoolId", "name", "permissions"],
                  properties: {
                    schoolId: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    permissions: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Created role" },
            409: { description: "Duplicate name in school" },
          },
        },
      },
      "/role/getRoles": {
        get: {
          tags: ["Roles"],
          summary: "List roles for a school",
          security: [{ TokenAuth: [] }],
          parameters: [
            {
              name: "schoolId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { 200: { description: "Array of roles" } },
        },
      },
      "/role/updateRole": {
        put: {
          tags: ["Roles"],
          summary: "Update a custom role",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["roleId"],
                  properties: {
                    roleId: { type: "string" },
                    name: { type: "string" },
                    permissions: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Updated role" },
            400: { description: "Cannot modify system role" },
          },
        },
      },
      "/role/deleteRole": {
        delete: {
          tags: ["Roles"],
          summary: "Delete a custom role",
          description:
            "Fails if isSystem is true. Removes memberships using this role.",
          security: [{ TokenAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["roleId"],
                  properties: { roleId: { type: "string" } },
                },
              },
            },
          },
          responses: {
            200: { description: "Deleted" },
            400: { description: "Cannot delete system role" },
          },
        },
      },

      /* ───── Permissions ───── */
      "/permission/getPermissions": {
        get: {
          tags: ["Permissions"],
          summary: "List all available permissions",
          security: [{ TokenAuth: [] }],
          responses: { 200: { description: "Array of permission objects" } },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "User", description: "User profile" },
      { name: "Schools", description: "School management" },
      { name: "Classrooms", description: "Classroom management" },
      { name: "Students", description: "Student management" },
      { name: "Resources", description: "Resource management" },
      { name: "Roles", description: "Dynamic role management" },
      { name: "Permissions", description: "Permission registry" },
    ],
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
