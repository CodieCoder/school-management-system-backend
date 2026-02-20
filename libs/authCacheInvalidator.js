const User = require("../managers/user/user.mongoModel");
const SchoolMembership = require("../managers/school_membership/school_membership.mongoModel");
const logger = require("./logger");

module.exports = class AuthCacheInvalidator {
  constructor({ cache }) {
    this.cache = cache;
  }

  async invalidateByUserId(userId) {
    try {
      const user = await User.findById(userId, "authId").lean();
      if (user?.authId) {
        await this.cache.key.del({ key: `auth:${user.authId}` });
      }
    } catch {
      logger.warn({ userId }, "Failed to invalidate auth cache for user");
    }
  }

  async invalidateByRoleId(roleId) {
    try {
      const memberships = await SchoolMembership.find(
        { roleId },
        "userId",
      ).lean();
      await Promise.all(
        memberships.map((m) => this.invalidateByUserId(m.userId)),
      );
    } catch {
      logger.warn({ roleId }, "Failed to invalidate auth cache for role");
    }
  }
};
