/**
 * Unit tests for permission matching logic (RoleManager.can / hasPermission / hasGlobalPermission).
 * No database or server — pure function tests.
 */

const RoleManager = require("../../managers/role/index");

const role = new RoleManager({
  managers: { permission: { isValidKey: () => true } },
  validators: { role: {} },
});

describe("RoleManager.can()", () => {
  test("exact match grants access", () => {
    expect(role.can(["school:read"], "school:read")).toBe(true);
  });

  test("unrelated permission denies access", () => {
    expect(role.can(["school:read"], "school:delete")).toBe(false);
  });

  test("wildcard *:* grants any permission", () => {
    expect(role.can(["*:*"], "student:transfer")).toBe(true);
  });

  test("resource wildcard grants any action on that resource", () => {
    expect(role.can(["school:*"], "school:delete")).toBe(true);
  });

  test("resource wildcard does not grant permissions on other resources", () => {
    expect(role.can(["school:*"], "student:read")).toBe(false);
  });

  test("empty permissions array denies access", () => {
    expect(role.can([], "school:read")).toBe(false);
  });

  test("null permissions denies access", () => {
    expect(role.can(null, "school:read")).toBe(false);
  });

  test("multiple permissions — one matching is enough", () => {
    expect(role.can(["classroom:read", "student:read"], "student:read")).toBe(
      true,
    );
  });
});

describe("RoleManager.hasPermission()", () => {
  const schoolA = "64a000000000000000000001";
  const schoolB = "64a000000000000000000002";

  const authContext = {
    isSuper: false,
    memberships: [
      { schoolId: schoolA, permissions: ["school:read", "classroom:read"] },
      { schoolId: schoolB, permissions: ["student:*"] },
    ],
  };

  test("grants permission when user has it for the target school", () => {
    expect(role.hasPermission(authContext, schoolA, "school:read")).toBe(true);
  });

  test("denies permission the user lacks for the target school", () => {
    expect(role.hasPermission(authContext, schoolA, "school:delete")).toBe(
      false,
    );
  });

  test("permissions are school-scoped — schoolB perms don't apply to schoolA", () => {
    expect(role.hasPermission(authContext, schoolA, "student:read")).toBe(
      false,
    );
  });

  test("resource wildcard works within school scope", () => {
    expect(role.hasPermission(authContext, schoolB, "student:delete")).toBe(
      true,
    );
  });

  test("denies when user has no membership for the school", () => {
    expect(
      role.hasPermission(
        authContext,
        "64a000000000000000000099",
        "school:read",
      ),
    ).toBe(false);
  });

  test("superadmin bypasses all checks", () => {
    const superAuth = { isSuper: true, memberships: [] };
    expect(role.hasPermission(superAuth, schoolA, "school:delete")).toBe(true);
  });
});

describe("RoleManager.hasGlobalPermission()", () => {
  const authContext = {
    isSuper: false,
    memberships: [
      { schoolId: "64a000000000000000000001", permissions: ["school:read"] },
      { schoolId: "64a000000000000000000002", permissions: ["student:create"] },
    ],
  };

  test("grants if any membership has the permission", () => {
    expect(role.hasGlobalPermission(authContext, "student:create")).toBe(true);
  });

  test("denies if no membership has the permission", () => {
    expect(role.hasGlobalPermission(authContext, "school:delete")).toBe(false);
  });

  test("superadmin bypasses all checks", () => {
    const superAuth = { isSuper: true, memberships: [] };
    expect(role.hasGlobalPermission(superAuth, "anything:here")).toBe(true);
  });
});
