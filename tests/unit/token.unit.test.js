/**
 * Unit tests for JWT token sign/verify logic in the local auth adapter.
 * No database — tests pure crypto functions with a mock config.
 */

const jwt = require("jsonwebtoken");

const TEST_SECRET = "unit-test-secret-key";

const LocalAuthAdapter = require("../../managers/auth/adapters/local.adapter");
const adapter = new LocalAuthAdapter({
  config: {
    dotEnv: { LONG_TOKEN_SECRET: TEST_SECRET, SHORT_TOKEN_SECRET: TEST_SECRET },
  },
});

describe("LocalAuthAdapter — token operations", () => {
  test("_signToken returns a valid JWT containing authId", () => {
    const token = adapter._signToken({ authId: "abc-123" });
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.authId).toBe("abc-123");
  });

  test("verifyToken decodes a valid token", () => {
    const token = adapter._signToken({ authId: "xyz-789" });
    const result = adapter.verifyToken({ token });
    expect(result).toEqual({ authId: "xyz-789" });
  });

  test("verifyToken returns null for a tampered token", () => {
    const token = adapter._signToken({ authId: "abc-123" });
    const result = adapter.verifyToken({ token: token + "tampered" });
    expect(result).toBeNull();
  });

  test("verifyToken returns null for a token signed with a different secret", () => {
    const foreignToken = jwt.sign({ authId: "abc-123" }, "wrong-secret");
    const result = adapter.verifyToken({ token: foreignToken });
    expect(result).toBeNull();
  });

  test("verifyToken returns null for an expired token", () => {
    const expiredToken = jwt.sign({ authId: "abc-123" }, TEST_SECRET, {
      expiresIn: "0s",
    });
    const result = adapter.verifyToken({ token: expiredToken });
    expect(result).toBeNull();
  });

  test("verifyToken returns null for empty string", () => {
    expect(adapter.verifyToken({ token: "" })).toBeNull();
  });

  test("verifyToken returns null for garbage input", () => {
    expect(adapter.verifyToken({ token: "not.a.jwt" })).toBeNull();
  });
});
