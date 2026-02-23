const LocalAdapter = require("./adapters/local.adapter");
const logger = require("../../libs/logger");
const { appError, ERROR_CODES } = require("../../libs/AppError");

module.exports = class AuthManager {
  constructor({ config, managers, validators }) {
    this.config = config;
    this.validators = validators.auth;
    this.userManager = managers.user;
    this.schoolMembership = managers.schoolMembership;
    this.role = managers.role;

    const provider = config.dotEnv.AUTH_PROVIDER || "local";
    if (provider === "local") {
      this.adapter = new LocalAdapter({ config });
    } else {
      throw new Error(`Unsupported auth provider: ${provider}`);
    }

    this.httpExposed = ["post=login", "post=register"];
  }

  verifyToken({ token }) {
    return this.adapter.verifyToken({ token });
  }

  async login({ email, password }) {
    if (!email || !password)
      return appError("email and password are required", ERROR_CODES.VALIDATION);

    let result = await this.validators.login({ email, password });
    if (result) return result;

    const authResult = await this.adapter.login({ email, password });
    if (authResult.error) return authResult;

    const user = await this.userManager.getByAuthId({
      authId: authResult.authId,
    });
    if (!user) return appError("user not found", ERROR_CODES.NOT_FOUND);

    const memberships = await this.schoolMembership.getMemberships({
      userId: user._id,
    });

    return {
      user: { _id: user._id, displayName: user.displayName },
      memberships,
      token: authResult.token,
    };
  }

  async register({ __auth, email, password, displayName }) {
    if (!email || !password || !displayName)
      return appError(
        "email, password, and displayName are required",
        ERROR_CODES.VALIDATION,
      );
    if (password.length < 8)
      return appError(
        "password must be at least 8 characters",
        ERROR_CODES.VALIDATION,
      );

    let result = await this.validators.register({
      email,
      password,
      displayName,
    });
    if (result) return result;

    if (!this.role.hasGlobalPermission(__auth, "user:create")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const authResult = await this.adapter.register({ email, password });
    if (authResult.error) return authResult;

    let user;
    try {
      user = await this.userManager.createProfile({
        authId: authResult.authId,
        displayName,
      });
    } catch (err) {
      await this.adapter.deleteUser({ authId: authResult.authId });
      return appError("failed to create user profile", ERROR_CODES.INTERNAL);
    }

    return {
      user: { _id: user._id, displayName: user.displayName },
      token: authResult.token,
    };
  }

  async seedSuperAdmin() {
    const email = this.config.dotEnv.SUPER_ADMIN_EMAIL;
    const password = this.config.dotEnv.SUPER_ADMIN_PASSWORD;
    if (!email || !password) return;

    const User = require("../user/user.mongoModel");
    const Role = require("../role/role.mongoModel");

    const existing = await require("./auth_identity.mongoModel").findOne({
      email: email.toLowerCase(),
    });
    if (existing) return;

    const authResult = await this.adapter.register({ email, password });
    if (authResult.error) return;

    const user = await User.create({
      authId: authResult.authId,
      displayName: "Super Admin",
    });
    const superRole = await Role.findOne({
      name: "superadmin",
      schoolId: null,
    });
    if (superRole) {
      await this.schoolMembership.createGlobal({
        userId: user._id,
        roleId: superRole._id,
      });
    }

    logger.info("Superadmin seeded: %s", email);
  }
};
