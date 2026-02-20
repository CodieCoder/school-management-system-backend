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
    expect(res.body.data.data).toBeInstanceOf(Array);
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data).toHaveProperty("total");
    expect(res.body.data).toHaveProperty("page");
    expect(res.body.data).toHaveProperty("limit");
    expect(res.body.data).toHaveProperty("pages");
  });
});

describe("GET /api/school/getSchoolStats", () => {
  let statsSchoolId;

  beforeAll(async () => {
    const schoolRes = await request
      .post("/api/school/createSchool")
      .set("token", adminToken)
      .send({ name: "Stats School" });
    statsSchoolId = schoolRes.body.data.school._id;

    const crRes = await request
      .post("/api/classroom/createClassroom")
      .set("token", adminToken)
      .send({ name: "Room A", schoolId: statsSchoolId, capacity: 30 });
    const classroomId = crRes.body.data._id;

    await request
      .post("/api/classroom/createClassroom")
      .set("token", adminToken)
      .send({ name: "Room B", schoolId: statsSchoolId, capacity: 20 });

    await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({ name: "Alice", schoolId: statsSchoolId, classroomId });
    await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({ name: "Bob", schoolId: statsSchoolId, classroomId });
    await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({ name: "Charlie", schoolId: statsSchoolId });

    await request
      .post("/api/resource/createResource")
      .set("token", adminToken)
      .send({ name: "Projector", schoolId: statsSchoolId, quantity: 2 });
    await request
      .post("/api/resource/createResource")
      .set("token", adminToken)
      .send({
        name: "Microscopes",
        schoolId: statsSchoolId,
        classroomId,
        quantity: 10,
      });
    await request
      .post("/api/resource/createResource")
      .set("token", adminToken)
      .send({
        name: "Broken Chairs",
        schoolId: statsSchoolId,
        isActive: false,
        quantity: 5,
      });
  });

  it("should return school stats with classroom breakdown", async () => {
    const res = await request
      .get("/api/school/getSchoolStats")
      .query({ schoolId: statsSchoolId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const data = res.body.data;
    expect(data.name).toBe("Stats School");
    expect(data.totalClassrooms).toBe(2);
    expect(data.totalStudents).toBe(3);
    expect(data.unassignedStudents).toBe(1);
    expect(data.classrooms).toHaveLength(2);

    expect(data.totalResources).toBe(3);
    expect(data.activeResources).toBe(2);
    expect(data.schoolWideResources).toBe(2);

    const roomA = data.classrooms.find((c) => c.name === "Room A");
    expect(roomA.studentCount).toBe(2);
    expect(roomA.capacity).toBe(30);
    expect(roomA.utilization).toBeCloseTo(6.7, 0);
    expect(roomA.resourceCount).toBe(1);

    const roomB = data.classrooms.find((c) => c.name === "Room B");
    expect(roomB.studentCount).toBe(0);
    expect(roomB.utilization).toBe(0);
    expect(roomB.resourceCount).toBe(0);
  });

  it("should return error for missing schoolId", async () => {
    const res = await request
      .get("/api/school/getSchoolStats")
      .set("token", adminToken);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return error for non-existent school", async () => {
    const res = await request
      .get("/api/school/getSchoolStats")
      .query({ schoolId: "000000000000000000000000" })
      .set("token", adminToken);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
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
