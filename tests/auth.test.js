const { getApp, getAdminToken } = require("./setup");

let request, adminToken;

beforeAll(async () => {
  const testApp = await getApp();
  request = testApp.request;
  adminToken = await getAdminToken();
});

describe("POST /api/auth/login", () => {
  it("should login with valid superadmin credentials", async () => {
    const res = await request.post("/api/auth/login").send({
      email: "admin@axion.local",
      password: "changeme123",
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user._id).toBeDefined();
    expect(res.body.data.user.displayName).toBe("Super Admin");
    expect(res.body.data.memberships).toBeInstanceOf(Array);
  });

  it("should reject login with wrong password", async () => {
    const res = await request.post("/api/auth/login").send({
      email: "admin@axion.local",
      password: "wrongpassword",
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it("should reject login with non-existent email", async () => {
    const res = await request.post("/api/auth/login").send({
      email: "nobody@nowhere.com",
      password: "whatever",
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should reject login with empty credentials", async () => {
    const res = await request.post("/api/auth/login").send({
      email: "",
      password: "",
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("POST /api/auth/register", () => {
  it("should register a new user when called by superadmin", async () => {
    const res = await request
      .post("/api/auth/register")
      .set("token", adminToken)
      .send({
        email: "auth-test-user@test.com",
        password: "password123",
        displayName: "Auth Test User",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user._id).toBeDefined();
    expect(res.body.data.user.displayName).toBe("Auth Test User");
    expect(res.body.data.token).toBeDefined();
  });

  it("should reject register without token", async () => {
    const res = await request.post("/api/auth/register").send({
      email: "noauth@test.com",
      password: "password123",
      displayName: "No Auth",
    });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it("should reject register with invalid token", async () => {
    const res = await request
      .post("/api/auth/register")
      .set("token", "not-a-valid-jwt")
      .send({
        email: "noauth@test.com",
        password: "password123",
        displayName: "Bad Token",
      });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it("should reject register with duplicate email", async () => {
    const res = await request
      .post("/api/auth/register")
      .set("token", adminToken)
      .send({
        email: "auth-test-user@test.com",
        password: "password123",
        displayName: "Duplicate",
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should reject register with invalid short password", async () => {
    const res = await request
      .post("/api/auth/register")
      .set("token", adminToken)
      .send({
        email: "incomplete@test.com",
        password: "ab",
        displayName: "Short Pass",
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/user/getProfile", () => {
  it("should return the authenticated user profile", async () => {
    const res = await request
      .get("/api/user/getProfile")
      .set("token", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.displayName).toBe("Super Admin");
    expect(res.body.data.memberships).toBeInstanceOf(Array);
  });

  it("should reject profile request without token", async () => {
    const res = await request.get("/api/user/getProfile");

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});
