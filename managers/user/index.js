const User = require("./user.mongoModel");

module.exports = class UserManager {
  constructor({ managers }) {
    this.schoolMembership = managers.schoolMembership;
    this.httpExposed = ["get=getProfile"];
  }

  async createProfile({ authId, displayName }) {
    return User.create({ authId, displayName });
  }

  async getByAuthId({ authId }) {
    return User.findOne({ authId }).lean();
  }

  async getById({ userId }) {
    return User.findById(userId).lean();
  }

  async getProfile({ __auth }) {
    const user = await User.findById(__auth.userId).lean();
    if (!user) return { error: "user not found" };

    return {
      ...user,
      memberships: __auth.memberships,
    };
  }

  async deleteByAuthId({ authId }) {
    return User.findOneAndDelete({ authId });
  }
};
