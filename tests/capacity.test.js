const { getApp, getAdminToken } = require("./setup");

let request, adminToken;
let schoolId, tinyClassroomId;

beforeAll(async () => {
  const testApp = await getApp();
  request = testApp.request;
  adminToken = await getAdminToken();

  const schoolRes = await request
    .post("/api/school/createSchool")
    .set("token", adminToken)
    .send({ name: "Capacity Test School" });
  schoolId = schoolRes.body.data.school._id;

  const crRes = await request
    .post("/api/classroom/createClassroom")
    .set("token", adminToken)
    .send({ name: "Tiny Room", schoolId, capacity: 2 });
  tinyClassroomId = crRes.body.data._id;
});

describe("Classroom capacity enforcement", () => {
  let student1Id, student2Id, unassignedId;

  it("should allow enrolling up to capacity", async () => {
    const res1 = await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({ name: "Cap Student 1", schoolId, classroomId: tinyClassroomId });
    expect(res1.body.ok).toBe(true);
    student1Id = res1.body.data._id;

    const res2 = await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({ name: "Cap Student 2", schoolId, classroomId: tinyClassroomId });
    expect(res2.body.ok).toBe(true);
    student2Id = res2.body.data._id;
  });

  it("should reject enrollment when classroom is full", async () => {
    const res = await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({ name: "Cap Student 3", schoolId, classroomId: tinyClassroomId });

    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/full capacity/i);
  });

  it("should reject updateStudent moving to a full classroom", async () => {
    const unassigned = await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({ name: "Unassigned Cap Student", schoolId });
    unassignedId = unassigned.body.data._id;

    const res = await request
      .put("/api/student/updateStudent")
      .set("token", adminToken)
      .send({ studentId: unassignedId, classroomId: tinyClassroomId });

    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/full capacity/i);
  });

  it("should allow updating a student already in the same classroom", async () => {
    const res = await request
      .put("/api/student/updateStudent")
      .set("token", adminToken)
      .send({
        studentId: student1Id,
        name: "Cap Student 1 Updated",
        classroomId: tinyClassroomId,
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Cap Student 1 Updated");
  });

  it("should allow enrollment after a student is removed", async () => {
    await request
      .delete("/api/student/deleteStudent")
      .set("token", adminToken)
      .send({ studentId: student2Id });

    const res = await request
      .put("/api/student/updateStudent")
      .set("token", adminToken)
      .send({ studentId: unassignedId, classroomId: tinyClassroomId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.classroomId).toBe(tinyClassroomId);
  });
});
