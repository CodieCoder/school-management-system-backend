const { getApp, getAdminToken } = require("./setup");

let request, adminToken;
let schoolId, classroomAId, classroomBId, resourceId;

beforeAll(async () => {
  const testApp = await getApp();
  request = testApp.request;
  adminToken = await getAdminToken();

  const schoolRes = await request
    .post("/api/school/createSchool")
    .set("token", adminToken)
    .send({ name: "Resource Test School" });
  schoolId = schoolRes.body.data.school._id;

  const crARes = await request
    .post("/api/classroom/createClassroom")
    .set("token", adminToken)
    .send({ name: "Lab A", schoolId, capacity: 20 });
  classroomAId = crARes.body.data._id;

  const crBRes = await request
    .post("/api/classroom/createClassroom")
    .set("token", adminToken)
    .send({ name: "Lab B", schoolId, capacity: 15 });
  classroomBId = crBRes.body.data._id;
});

describe("POST /api/resource/createResource", () => {
  it("should create a school-wide resource", async () => {
    const res = await request
      .post("/api/resource/createResource")
      .set("token", adminToken)
      .send({
        name: "Projectors",
        schoolId,
        quantity: 5,
        description: "Epson HD projectors",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Projectors");
    expect(res.body.data.classroomId).toBeNull();
    expect(res.body.data.quantity).toBe(5);
    expect(res.body.data.isActive).toBe(true);

    resourceId = res.body.data._id;
  });

  it("should create a classroom-specific resource", async () => {
    const res = await request
      .post("/api/resource/createResource")
      .set("token", adminToken)
      .send({
        name: "Microscopes",
        schoolId,
        classroomId: classroomAId,
        quantity: 10,
        description: "Biology lab microscopes",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.classroomId).toBe(classroomAId);
  });

  it("should create a resource with extraData", async () => {
    const res = await request
      .post("/api/resource/createResource")
      .set("token", adminToken)
      .send({
        name: "Computers",
        schoolId,
        classroomId: classroomBId,
        quantity: 25,
        extraData: { brand: "Dell", model: "Optiplex 7090" },
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.extraData.brand).toBe("Dell");
  });

  it("should reject resource with empty name", async () => {
    const res = await request
      .post("/api/resource/createResource")
      .set("token", adminToken)
      .send({ name: "", schoolId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should reject resource with missing schoolId", async () => {
    const res = await request
      .post("/api/resource/createResource")
      .set("token", adminToken)
      .send({ name: "Whiteboards" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should reject resource with classroom from different school", async () => {
    const otherSchool = await request
      .post("/api/school/createSchool")
      .set("token", adminToken)
      .send({ name: "Other Resource School" });
    const otherSchoolId = otherSchool.body.data.school._id;

    const res = await request
      .post("/api/resource/createResource")
      .set("token", adminToken)
      .send({
        name: "Tablets",
        schoolId: otherSchoolId,
        classroomId: classroomAId,
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/does not belong/i);
  });
});

describe("GET /api/resource/getResource", () => {
  it("should return a resource by ID", async () => {
    const res = await request
      .get("/api/resource/getResource")
      .query({ resourceId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Projectors");
  });

  it("should return error for non-existent resource", async () => {
    const res = await request
      .get("/api/resource/getResource")
      .query({ resourceId: "000000000000000000000000" })
      .set("token", adminToken);

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it("should return error for missing resourceId", async () => {
    const res = await request
      .get("/api/resource/getResource")
      .set("token", adminToken);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/resource/getResources", () => {
  it("should return all resources for a school", async () => {
    const res = await request
      .get("/api/resource/getResources")
      .query({ schoolId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data).toHaveProperty("total");
    expect(res.body.data).toHaveProperty("page");
    expect(res.body.data).toHaveProperty("pages");
  });

  it("should filter resources by classroom", async () => {
    const res = await request
      .get("/api/resource/getResources")
      .query({ schoolId, classroomId: classroomAId })
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    res.body.data.data.forEach((r) => {
      expect(String(r.classroomId._id || r.classroomId)).toBe(
        String(classroomAId),
      );
    });
  });
});

describe("PUT /api/resource/updateResource", () => {
  it("should update resource fields", async () => {
    const res = await request
      .put("/api/resource/updateResource")
      .set("token", adminToken)
      .send({
        resourceId,
        name: "HD Projectors",
        quantity: 8,
        isActive: false,
        description: "Updated projectors",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("HD Projectors");
    expect(res.body.data.quantity).toBe(8);
    expect(res.body.data.isActive).toBe(false);
    expect(res.body.data.description).toBe("Updated projectors");
  });

  it("should move a school-wide resource to a classroom", async () => {
    const res = await request
      .put("/api/resource/updateResource")
      .set("token", adminToken)
      .send({ resourceId, classroomId: classroomAId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.classroomId).toBe(classroomAId);
  });

  it("should move a classroom resource back to school-wide", async () => {
    const res = await request
      .put("/api/resource/updateResource")
      .set("token", adminToken)
      .send({ resourceId, classroomId: null });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.classroomId).toBeNull();
  });
});

describe("DELETE /api/resource/deleteResource", () => {
  it("should delete a resource", async () => {
    const res = await request
      .delete("/api/resource/deleteResource")
      .set("token", adminToken)
      .send({ resourceId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const getRes = await request
      .get("/api/resource/getResource")
      .query({ resourceId })
      .set("token", adminToken);
    expect(getRes.body.ok).toBe(false);
  });
});

describe("Resource cascade on classroom delete", () => {
  let cascadeClassroomId, cascadeResourceId;

  beforeAll(async () => {
    const crRes = await request
      .post("/api/classroom/createClassroom")
      .set("token", adminToken)
      .send({ name: "Cascade Room", schoolId });
    cascadeClassroomId = crRes.body.data._id;

    const rRes = await request
      .post("/api/resource/createResource")
      .set("token", adminToken)
      .send({
        name: "Cascade Whiteboard",
        schoolId,
        classroomId: cascadeClassroomId,
      });
    cascadeResourceId = rRes.body.data._id;
  });

  it("should delete classroom resources when classroom is deleted", async () => {
    await request
      .delete("/api/classroom/deleteClassroom")
      .set("token", adminToken)
      .send({ classroomId: cascadeClassroomId });

    const res = await request
      .get("/api/resource/getResource")
      .query({ resourceId: cascadeResourceId })
      .set("token", adminToken);

    expect(res.body.ok).toBe(false);
  });
});
