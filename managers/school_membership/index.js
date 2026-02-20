const mongoose = require("mongoose");
const SchoolMembership = require("./school_membership.mongoModel");
const { appError, ERROR_CODES } = require("../../libs/AppError");

module.exports = class SchoolMembershipManager {
  constructor({ managers } = {}) {
    this.authCacheInvalidator = managers?.authCacheInvalidator;
  }

  async create({ userId, schoolId, roleId }) {
    const existing = await SchoolMembership.findOne({ userId, schoolId });
    if (existing) return appError("user is already a member of this school", ERROR_CODES.DUPLICATE);

    const membership = await SchoolMembership.create({ userId, schoolId, roleId });
    if (this.authCacheInvalidator) {
      await this.authCacheInvalidator.invalidateByUserId(userId);
    }
    return membership;
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
    if (this.authCacheInvalidator) {
      await this.authCacheInvalidator.invalidateByUserId(userId);
    }
    return { message: "membership removed" };
  }

  async getMemberships({ userId }) {
    const oid = new mongoose.Types.ObjectId(userId);

    const memberships = await SchoolMembership.aggregate([
      { $match: { userId: oid } },
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "_role",
        },
      },
      {
        $lookup: {
          from: "schools",
          localField: "schoolId",
          foreignField: "_id",
          as: "_school",
        },
      },
      {
        $project: {
          schoolId: {
            $ifNull: [{ $arrayElemAt: ["$_school._id", 0] }, null],
          },
          schoolName: {
            $ifNull: [{ $arrayElemAt: ["$_school.name", 0] }, null],
          },
          roleName: {
            $ifNull: [{ $arrayElemAt: ["$_role.name", 0] }, null],
          },
          permissions: {
            $ifNull: [{ $arrayElemAt: ["$_role.permissions", 0] }, []],
          },
          isGlobal: { $eq: ["$schoolId", null] },
        },
      },
    ]);

    return memberships;
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
