const SchoolMembership = require("./school_membership.mongoModel");

module.exports = class SchoolMembershipManager {

  async create({ userId, schoolId, roleId }) {
    const existing = await SchoolMembership.findOne({ userId, schoolId });
    if (existing) return { error: "user is already a member of this school" };

    return SchoolMembership.create({ userId, schoolId, roleId });
  }

  async createGlobal({ userId, roleId }) {
    const existing = await SchoolMembership.findOne({ userId, schoolId: null });
    if (existing) return existing;
    return SchoolMembership.create({ userId, schoolId: null, roleId });
  }

  async remove({ userId, schoolId }) {
    const membership = await SchoolMembership.findOne({ userId, schoolId });
    if (!membership) return { error: "membership not found" };
    await membership.deleteOne();
    return { message: "membership removed" };
  }

  async getMemberships({ userId }) {
    const memberships = await SchoolMembership.find({ userId })
      .populate("roleId")
      .populate("schoolId")
      .lean();

    return memberships.map((m) => ({
      _id: m._id,
      schoolId: m.schoolId ? m.schoolId._id : null,
      schoolName: m.schoolId ? m.schoolId.name : null,
      roleName: m.roleId ? m.roleId.name : null,
      permissions: m.roleId ? m.roleId.permissions : [],
      isGlobal: m.schoolId === null,
    }));
  }

  async getSchoolMembers({ schoolId }) {
    const memberships = await SchoolMembership.find({ schoolId })
      .populate("userId")
      .populate("roleId")
      .lean();

    return memberships.map((m) => ({
      _id: m._id,
      userId: m.userId ? m.userId._id : null,
      displayName: m.userId ? m.userId.displayName : null,
      roleName: m.roleId ? m.roleId.name : null,
      permissions: m.roleId ? m.roleId.permissions : [],
    }));
  }
};
