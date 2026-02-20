const Role = require("./role.mongoModel");
const SchoolMembership = require("../school_membership/school_membership.mongoModel");
const { appError, ERROR_CODES } = require("../../libs/AppError");

const GLOBAL_SEED = [
  {
    name: "superadmin",
    description: "Full system access",
    permissions: ["*:*"],
    schoolId: null,
    isSystem: true,
  },
];

module.exports = class RoleManager {
  constructor({ managers, validators }) {
    this.validators = validators.role;
    this.permission = managers.permission;
    this.authCacheInvalidator = managers.authCacheInvalidator;

    this.httpExposed = [
      "post=createRole",
      "get=getRoles",
      "put=updateRole",
      "delete=deleteRole",
    ];
  }

  async seed() {
    for (const role of GLOBAL_SEED) {
      await Role.findOneAndUpdate({ name: role.name, schoolId: null }, role, {
        upsert: true,
        returnDocument: "after",
      });
    }
  }

  async createOwnerRoleForSchool(schoolId) {
    return Role.create({
      name: "owner",
      description: "School owner — full access",
      permissions: ["*:*"],
      schoolId,
      isSystem: true,
    });
  }

  can(permissions, required) {
    if (!permissions || !permissions.length) return false;
    if (permissions.includes("*:*")) return true;

    if (permissions.includes(required)) return true;

    const [resource] = required.split(":");
    if (permissions.includes(`${resource}:*`)) return true;

    return false;
  }

  hasPermission(authContext, schoolId, required) {
    if (authContext.isSuper) return true;
    const membership = authContext.memberships.find(
      (m) => m.schoolId && m.schoolId.toString() === schoolId.toString(),
    );
    if (!membership) return false;
    return this.can(membership.permissions, required);
  }

  hasGlobalPermission(authContext, required) {
    if (authContext.isSuper) return true;
    for (const m of authContext.memberships) {
      if (this.can(m.permissions, required)) return true;
    }
    return false;
  }

  async createRole({ __auth, schoolId, name, description, permissions }) {
    let result = await this.validators.createRole({
      schoolId,
      name,
      permissions,
    });
    if (result) return result;

    if (!this.hasPermission(__auth, schoolId, "school:manage_roles")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    for (const key of permissions) {
      if (key.includes("*")) continue;
      if (!this.permission.isValidKey(key)) {
        return { error: `invalid permission key: ${key}` };
      }
    }

    const existing = await Role.findOne({ schoolId, name });
    if (existing) return appError("role name already exists in this school", ERROR_CODES.DUPLICATE);

    const role = await Role.create({
      name,
      description,
      permissions,
      schoolId,
    });
    return role.toObject();
  }

  async getRoles({ __auth, __query }) {
    const { schoolId } = __query || {};
    if (!schoolId) return { error: "schoolId is required" };

    const membership = __auth.memberships.find(
      (m) => m.schoolId && m.schoolId.toString() === schoolId.toString(),
    );
    if (!membership && !__auth.isSuper)
      return { error: "not a member of this school" };

    const roles = await Role.find({ schoolId }).lean();
    return roles;
  }

  async updateRole({ __auth, roleId, name, permissions }) {
    let result = await this.validators.updateRole({ roleId });
    if (result) return result;

    const role = await Role.findById(roleId);
    if (!role) return appError("role not found", ERROR_CODES.NOT_FOUND);
    if (role.isSystem) return { error: "cannot modify system role" };

    if (!this.hasPermission(__auth, role.schoolId, "school:manage_roles")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    if (permissions) {
      for (const key of permissions) {
        if (key.includes("*")) continue;
        if (!this.permission.isValidKey(key)) {
          return { error: `invalid permission key: ${key}` };
        }
      }
    }

    if (name) role.name = name;
    if (permissions) role.permissions = permissions;
    await role.save();
    if (permissions) {
      await this.authCacheInvalidator.invalidateByRoleId(role._id);
    }
    return role.toObject();
  }

  async deleteRole({ __auth, roleId }) {
    const role = await Role.findById(roleId);
    if (!role) return appError("role not found", ERROR_CODES.NOT_FOUND);
    if (role.isSystem) return { error: "cannot delete system role" };

    if (!this.hasPermission(__auth, role.schoolId, "school:manage_roles")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const callerMembership = await SchoolMembership.findOne({
      userId: __auth.userId,
      schoolId: role.schoolId,
      roleId: role._id,
    });
    if (callerMembership) {
      return { error: "cannot delete a role you are currently assigned to" };
    }

    await this.authCacheInvalidator.invalidateByRoleId(role._id);
    await SchoolMembership.deleteMany({ roleId: role._id });
    await role.deleteOne();
    return { message: "role deleted" };
  }
};
