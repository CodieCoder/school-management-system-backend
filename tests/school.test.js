const { getApp, getAdminToken } = require("./setup");

let request, adminToken;
let schoolId, newUserId, ownerRoleId;

beforeAll(async () => {
  const testApp = await getApp();
  request = testApp.request;
  adminToken = await getAdminToken();
});

describe("POST /api/school/createSchool", () => {
  it("should create a school and assign creator as owner", async () => {
    const res = await request
      .post("/api/school/createSchool")
      .set("token", adminToken)
      .send({
        name: "School Test Academy",
        address: "123 Test St",
        phone: "+1234567890",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.school.name).toBe("School Test Academy");
    expect(res.body.data.membership.roleName).toBe("owner");

    schoolId = res.body.data.school._id;
    ownerRoleId = res.body.data.membership.roleId;
  });

  it("should reject creating a school with empty name", async () => {
    const res = await request
      .post("/api/school/createSchool")
      .set("token", adminToken)
      .send({ name: "", address: "456 No Name Ave" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should reject creating a school without auth", async () => {
    const res = await request
      .post("/api/school/createSchool")
      .send({ name: "Unauthorized School" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/school/getSchool", () => {
  it("should return a school by ID", async () => {
    const res = await request
      .get("/api/school/getSchool")
      .query({ schoolId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("School Test Academy");
  });

  it("should return error for non-existent school", async () => {
    const res = await request
      .get("/api/school/getSchool")
      .query({ schoolId: "000000000000000000000000" })
      .set("token", adminToken);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return error when schoolId is missing", async () => {
    const res = await request
      .get("/api/school/getSchool")
      .set("token", adminToken);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/school/getSchools", () => {
  it("should return all schools for superadmin", async () => {
    const res = await request
      .get("/api/school/getSchools")
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe("PUT /api/school/updateSchool", () => {
  it("should update school fields", async () => {
    const res = await request
      .put("/api/school/updateSchool")
      .set("token", adminToken)
      .send({
        schoolId,
        name: "School Test Academy (Updated)",
        phone: "+0000000000",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("School Test Academy (Updated)");
    expect(res.body.data.phone).toBe("+0000000000");
  });

  it("should reject update for non-existent school", async () => {
    const res = await request
      .put("/api/school/updateSchool")
      .set("token", adminToken)
      .send({ schoolId: "000000000000000000000000", name: "Ghost" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("POST /api/school/addMember & DELETE /api/school/removeMember", () => {
  beforeAll(async () => {
    const regRes = await request
      .post("/api/auth/register")
      .set("token", adminToken)
      .send({
        email: "school-member@test.com",
        password: "password123",
        displayName: "School Member",
      });
    newUserId = regRes.body.data.user._id;
  });

  it("should add a member to a school", async () => {
    const rolesRes = await request
      .get("/api/role/getRoles")
      .query({ schoolId })
      .set("token", adminToken);
    const ownerRole = rolesRes.body.data.find((r) => r.name === "owner");

    const res = await request
      .post("/api/school/addMember")
      .set("token", adminToken)
      .send({ schoolId, userId: newUserId, roleId: ownerRole._id });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("should reject adding a duplicate member", async () => {
    const rolesRes = await request
      .get("/api/role/getRoles")
      .query({ schoolId })
      .set("token", adminToken);
    const ownerRole = rolesRes.body.data.find((r) => r.name === "owner");

    const res = await request
      .post("/api/school/addMember")
      .set("token", adminToken)
      .send({ schoolId, userId: newUserId, roleId: ownerRole._id });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/already a member/i);
  });

  it("should remove a member from a school", async () => {
    const res = await request
      .delete("/api/school/removeMember")
      .set("token", adminToken)
      .send({ schoolId, userId: newUserId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("should prevent removing yourself from a school", async () => {
    const profileRes = await request
      .get("/api/user/getProfile")
      .set("token", adminToken);
    const myUserId = profileRes.body.data._id;

    const res = await request
      .delete("/api/school/removeMember")
      .set("token", adminToken)
      .send({ schoolId, userId: myUserId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/cannot remove yourself/i);
  });
});

describe("DELETE /api/school/deleteSchool", () => {
  let deleteSchoolId;

  beforeAll(async () => {
    const res = await request
      .post("/api/school/createSchool")
      .set("token", adminToken)
      .send({ name: "School To Delete" });
    deleteSchoolId = res.body.data.school._id;
  });

  it("should delete a school and cascade", async () => {
    const res = await request
      .delete("/api/school/deleteSchool")
      .set("token", adminToken)
      .send({ schoolId: deleteSchoolId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const getRes = await request
      .get("/api/school/getSchool")
      .query({ schoolId: deleteSchoolId })
      .set("token", adminToken);

    expect(getRes.body.ok).toBe(false);
  });
});
