const { getApp, getAdminToken } = require("./setup");

let request, adminToken;
let schoolAId, schoolBId, classroomId, studentId;

beforeAll(async () => {
  const testApp = await getApp();
  request = testApp.request;
  adminToken = await getAdminToken();

  const schoolARes = await request
    .post("/api/school/createSchool")
    .set("token", adminToken)
    .send({ name: "Student Test School A" });
  schoolAId = schoolARes.body.data.school._id;

  const schoolBRes = await request
    .post("/api/school/createSchool")
    .set("token", adminToken)
    .send({ name: "Student Test School B" });
  schoolBId = schoolBRes.body.data.school._id;

  const classroomRes = await request
    .post("/api/classroom/createClassroom")
    .set("token", adminToken)
    .send({ name: "Student Homeroom", schoolId: schoolAId });
  classroomId = classroomRes.body.data._id;
});

describe("POST /api/student/createStudent", () => {
  it("should enroll a student in a school", async () => {
    const res = await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({
        name: "Alice Smith",
        email: "alice@student.com",
        schoolId: schoolAId,
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Alice Smith");
    expect(res.body.data.schoolId).toBe(schoolAId);

    studentId = res.body.data._id;
  });

  it("should enroll a student directly into a classroom", async () => {
    const res = await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({ name: "Bob Jones", schoolId: schoolAId, classroomId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.classroomId).toBe(classroomId);
  });

  it("should reject student with duplicate email", async () => {
    const res = await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({
        name: "Dupe Alice",
        email: "alice@student.com",
        schoolId: schoolAId,
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should reject student assigned to classroom from different school", async () => {
    const res = await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({ name: "Cross School", schoolId: schoolBId, classroomId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/does not belong/i);
  });

  it("should reject student with empty name", async () => {
    const res = await request
      .post("/api/student/createStudent")
      .set("token", adminToken)
      .send({ name: "", schoolId: schoolAId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/student/getStudent", () => {
  it("should return a student by ID", async () => {
    const res = await request
      .get("/api/student/getStudent")
      .query({ studentId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Alice Smith");
  });

  it("should return error for non-existent student", async () => {
    const res = await request
      .get("/api/student/getStudent")
      .query({ studentId: "000000000000000000000000" })
      .set("token", adminToken);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/student/getStudents", () => {
  it("should return all students for a school", async () => {
    const res = await request
      .get("/api/student/getStudents")
      .query({ schoolId: schoolAId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("should filter students by classroom", async () => {
    const res = await request
      .get("/api/student/getStudents")
      .query({ schoolId: schoolAId, classroomId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const all = res.body.data;
    all.forEach((s) => {
      expect(s.classroomId).toBeTruthy();
    });
  });
});

describe("PUT /api/student/updateStudent", () => {
  it("should update student fields", async () => {
    const res = await request
      .put("/api/student/updateStudent")
      .set("token", adminToken)
      .send({ studentId, name: "Alice Smith-Updated", classroomId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Alice Smith-Updated");
    expect(res.body.data.classroomId).toBe(classroomId);
  });
});

describe("POST /api/student/transferStudent", () => {
  it("should transfer a student to another school", async () => {
    const res = await request
      .post("/api/student/transferStudent")
      .set("token", adminToken)
      .send({ studentId, newSchoolId: schoolBId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.schoolId).toBe(schoolBId);
    expect(res.body.data.classroomId).toBeNull();
  });

  it("should reject transfer to the same school", async () => {
    const res = await request
      .post("/api/student/transferStudent")
      .set("token", adminToken)
      .send({ studentId, newSchoolId: schoolBId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/same school/i);
  });

  it("should reject transfer to non-existent school", async () => {
    const res = await request
      .post("/api/student/transferStudent")
      .set("token", adminToken)
      .send({ studentId, newSchoolId: "000000000000000000000000" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("DELETE /api/student/deleteStudent", () => {
  it("should delete a student", async () => {
    const res = await request
      .delete("/api/student/deleteStudent")
      .set("token", adminToken)
      .send({ studentId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const getRes = await request
      .get("/api/student/getStudent")
      .query({ studentId })
      .set("token", adminToken);
    expect(getRes.body.ok).toBe(false);
  });
});
