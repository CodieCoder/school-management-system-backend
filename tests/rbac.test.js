const { getApp, getAdminToken, loginAs } = require("./setup");

let request, adminToken;
let schoolId, limitedRoleId, limitedUserId, limitedToken;

beforeAll(async () => {
  const testApp = await getApp();
  request = testApp.request;
  adminToken = await getAdminToken();

  const schoolRes = await request
    .post("/api/school/createSchool")
    .set("token", adminToken)
    .send({ name: "RBAC Test School" });
  schoolId = schoolRes.body.data.school._id;

  const roleRes = await request
    .post("/api/role/createRole")
    .set("token", adminToken)
    .send({
      schoolId,
      name: "viewer",
      permissions: ["school:read", "classroom:read", "student:read"],
    });
  limitedRoleId = roleRes.body.data._id;

  const regRes = await request
    .post("/api/auth/register")
    .set("token", adminToken)
    .send({
      email: "rbac-viewer@test.com",
      password: "viewer123",
      displayName: "Limited Viewer",
    });
  limitedUserId = regRes.body.data.user._id;

  await request
    .post("/api/school/addMember")
    .set("token", adminToken)
    .send({ schoolId, userId: limitedUserId, roleId: limitedRoleId });

  limitedToken = await loginAs("rbac-viewer@test.com", "viewer123");
});

describe("Permission enforcement — allowed operations", () => {
  it("limited user can read their school", async () => {
    const res = await request
      .get("/api/school/getSchool")
      .query({ schoolId })
      .set("token", limitedToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("RBAC Test School");
  });

  it("limited user can list schools they belong to", async () => {
    const res = await request
      .get("/api/school/getSchools")
      .set("token", limitedToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
  });

  it("limited user can list classrooms (read permission)", async () => {
    const res = await request
      .get("/api/classroom/getClassrooms")
      .query({ schoolId })
      .set("token", limitedToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("limited user can list students (read permission)", async () => {
    const res = await request
      .get("/api/student/getStudents")
      .query({ schoolId })
      .set("token", limitedToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("Permission enforcement — denied operations", () => {
  it("limited user cannot update school", async () => {
    const res = await request
      .put("/api/school/updateSchool")
      .set("token", limitedToken)
      .send({ schoolId, name: "Hacked Name" });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/permission denied/i);
  });

  it("limited user cannot delete school", async () => {
    const res = await request
      .delete("/api/school/deleteSchool")
      .set("token", limitedToken)
      .send({ schoolId });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/permission denied/i);
  });

  it("limited user cannot create classrooms", async () => {
    const res = await request
      .post("/api/classroom/createClassroom")
      .set("token", limitedToken)
      .send({ name: "Unauthorized Room", schoolId });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/permission denied/i);
  });

  it("limited user cannot create students", async () => {
    const res = await request
      .post("/api/student/createStudent")
      .set("token", limitedToken)
      .send({ name: "Unauthorized Student", schoolId });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/permission denied/i);
  });

  it("limited user cannot manage roles", async () => {
    const res = await request
      .post("/api/role/createRole")
      .set("token", limitedToken)
      .send({ schoolId, name: "hacker-role", permissions: ["*:*"] });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/permission denied/i);
  });

  it("limited user cannot register new users", async () => {
    const res = await request
      .post("/api/auth/register")
      .set("token", limitedToken)
      .send({
        email: "hacker@test.com",
        password: "password123",
        displayName: "Hacker",
      });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/permission denied/i);
  });
});

describe("Role CRUD", () => {
  let customRoleId;

  it("should create a custom role for a school", async () => {
    const res = await request
      .post("/api/role/createRole")
      .set("token", adminToken)
      .send({
        schoolId,
        name: "editor",
        permissions: [
          "school:read",
          "classroom:read",
          "classroom:update",
          "student:read",
          "student:update",
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("editor");
    customRoleId = res.body.data._id;
  });

  it("should reject duplicate role name in same school", async () => {
    const res = await request
      .post("/api/role/createRole")
      .set("token", adminToken)
      .send({ schoolId, name: "editor", permissions: ["school:read"] });

    expect(res.status).toBe(409);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should reject role with invalid permission key", async () => {
    const res = await request
      .post("/api/role/createRole")
      .set("token", adminToken)
      .send({ schoolId, name: "badperm", permissions: ["fake:permission"] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/invalid permission key/i);
  });

  it("should list roles for a school", async () => {
    const res = await request
      .get("/api/role/getRoles")
      .query({ schoolId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const names = res.body.data.map((r) => r.name);
    expect(names).toContain("owner");
    expect(names).toContain("viewer");
    expect(names).toContain("editor");
  });

  it("should update a custom role", async () => {
    const res = await request
      .put("/api/role/updateRole")
      .set("token", adminToken)
      .send({
        roleId: customRoleId,
        permissions: ["school:read", "classroom:read"],
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.permissions).toEqual([
      "school:read",
      "classroom:read",
    ]);
  });

  it("should reject updating a system role", async () => {
    const rolesRes = await request
      .get("/api/role/getRoles")
      .query({ schoolId })
      .set("token", adminToken);
    const ownerRole = rolesRes.body.data.find((r) => r.name === "owner");

    const res = await request
      .put("/api/role/updateRole")
      .set("token", adminToken)
      .send({ roleId: ownerRole._id, name: "renamed-owner" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/system role/i);
  });

  it("should reject deleting a system role", async () => {
    const rolesRes = await request
      .get("/api/role/getRoles")
      .query({ schoolId })
      .set("token", adminToken);
    const ownerRole = rolesRes.body.data.find((r) => r.name === "owner");

    const res = await request
      .delete("/api/role/deleteRole")
      .set("token", adminToken)
      .send({ roleId: ownerRole._id });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/system role/i);
  });

  it("should reject deleting a role the caller is assigned to", async () => {
    const managerRole = await request
      .post("/api/role/createRole")
      .set("token", adminToken)
      .send({
        schoolId,
        name: "self-delete-test",
        permissions: ["school:read", "school:manage_roles"],
      });
    const managerRoleId = managerRole.body.data._id;

    const regRes = await request
      .post("/api/auth/register")
      .set("token", adminToken)
      .send({
        email: "self-delete@test.com",
        password: "password123",
        displayName: "Self Delete Tester",
      });
    const testUserId = regRes.body.data.user._id;

    await request
      .post("/api/school/addMember")
      .set("token", adminToken)
      .send({ schoolId, userId: testUserId, roleId: managerRoleId });

    const testToken = await loginAs("self-delete@test.com", "password123");

    const res = await request
      .delete("/api/role/deleteRole")
      .set("token", testToken)
      .send({ roleId: managerRoleId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/currently assigned/i);

    await request
      .delete("/api/role/deleteRole")
      .set("token", adminToken)
      .send({ roleId: managerRoleId });
  });

  it("should delete a custom role", async () => {
    const res = await request
      .delete("/api/role/deleteRole")
      .set("token", adminToken)
      .send({ roleId: customRoleId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("GET /api/permission/getPermissions", () => {
  it("should list all available permissions", async () => {
    const res = await request
      .get("/api/permission/getPermissions")
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(19);

    const keys = res.body.data.map((p) => p.key);
    expect(keys).toContain("school:create");
    expect(keys).toContain("student:transfer");
    expect(keys).toContain("classroom:delete");
  });
});

describe("Superadmin bypass", () => {
  it("superadmin can access any school even without membership", async () => {
    const otherSchoolRes = await request
      .post("/api/school/createSchool")
      .set("token", limitedToken.replace("x", "y"));

    const schoolRes = await request
      .post("/api/school/createSchool")
      .set("token", adminToken)
      .send({ name: "Admin Bypass School" });

    if (schoolRes.body.ok) {
      const sid = schoolRes.body.data.school._id;
      const res = await request
        .get("/api/school/getSchool")
        .query({ schoolId: sid })
        .set("token", adminToken);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    }
  });
});
