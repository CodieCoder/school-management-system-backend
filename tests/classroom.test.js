const { getApp, getAdminToken } = require("./setup");

let request, adminToken;
let schoolId, classroomId;

beforeAll(async () => {
  const testApp = await getApp();
  request = testApp.request;
  adminToken = await getAdminToken();

  const schoolRes = await request
    .post("/api/school/createSchool")
    .set("token", adminToken)
    .send({ name: "Classroom Test School" });
  schoolId = schoolRes.body.data.school._id;
});

describe("POST /api/classroom/createClassroom", () => {
  it("should create a classroom in a school", async () => {
    const res = await request
      .post("/api/classroom/createClassroom")
      .set("token", adminToken)
      .send({ name: "Room 101", schoolId, capacity: 25 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Room 101");
    expect(res.body.data.capacity).toBe(25);
    expect(res.body.data.schoolId).toBe(schoolId);

    classroomId = res.body.data._id;
  });

  it("should create a classroom with default capacity", async () => {
    const res = await request
      .post("/api/classroom/createClassroom")
      .set("token", adminToken)
      .send({ name: "Room 102", schoolId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.capacity).toBe(30);
  });

  it("should reject duplicate classroom name in same school", async () => {
    const res = await request
      .post("/api/classroom/createClassroom")
      .set("token", adminToken)
      .send({ name: "Room 101", schoolId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should reject classroom with empty name", async () => {
    const res = await request
      .post("/api/classroom/createClassroom")
      .set("token", adminToken)
      .send({ name: "", schoolId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should reject classroom creation without auth", async () => {
    const res = await request
      .post("/api/classroom/createClassroom")
      .send({ name: "Unauth Room", schoolId });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/classroom/getClassroom", () => {
  it("should return a classroom by ID", async () => {
    const res = await request
      .get("/api/classroom/getClassroom")
      .query({ classroomId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Room 101");
  });

  it("should return error for non-existent classroom", async () => {
    const res = await request
      .get("/api/classroom/getClassroom")
      .query({ classroomId: "000000000000000000000000" })
      .set("token", adminToken);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/classroom/getClassrooms", () => {
  it("should return all classrooms for a school", async () => {
    const res = await request
      .get("/api/classroom/getClassrooms")
      .query({ schoolId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

describe("PUT /api/classroom/updateClassroom", () => {
  it("should update classroom fields", async () => {
    const res = await request
      .put("/api/classroom/updateClassroom")
      .set("token", adminToken)
      .send({
        classroomId,
        capacity: 40,
        resources: ["projector", "whiteboard"],
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.capacity).toBe(40);
    expect(res.body.data.resources).toEqual(["projector", "whiteboard"]);
  });

  it("should reject rename to a duplicate name", async () => {
    const res = await request
      .put("/api/classroom/updateClassroom")
      .set("token", adminToken)
      .send({ classroomId, name: "Room 102" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

describe("DELETE /api/classroom/deleteClassroom", () => {
  let deleteClassroomId;

  beforeAll(async () => {
    const res = await request
      .post("/api/classroom/createClassroom")
      .set("token", adminToken)
      .send({ name: "Room To Delete", schoolId });
    deleteClassroomId = res.body.data._id;
  });

  it("should delete a classroom", async () => {
    const res = await request
      .delete("/api/classroom/deleteClassroom")
      .set("token", adminToken)
      .send({ classroomId: deleteClassroomId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const getRes = await request
      .get("/api/classroom/getClassroom")
      .query({ classroomId: deleteClassroomId })
      .set("token", adminToken);
    expect(getRes.body.ok).toBe(false);
  });
});
