const mongoose = require("mongoose");
const School = require("./school.mongoModel");
const Role = require("../role/role.mongoModel");
const SchoolMembership = require("../school_membership/school_membership.mongoModel");
const Classroom = require("../classroom/classroom.mongoModel");
const Student = require("../student/student.mongoModel");
const Resource = require("../resource/resource.mongoModel");
const { parsePagination, paginate } = require("../../libs/paginate");
const { appError, ERROR_CODES } = require("../../libs/AppError");

module.exports = class SchoolManager {
  constructor({ managers, validators }) {
    this.validators = validators.school;
    this.role = managers.role;
    this.schoolMembership = managers.schoolMembership;
    this.responseDispatcher = managers.responseDispatcher;

    this.httpExposed = [
      "post=createSchool",
      "get=getSchool",
      "get=getSchools",
      "get=getSchoolStats",
      "put=updateSchool",
      "delete=deleteSchool",
      "post=addMember",
      "delete=removeMember",
    ];
  }

  async createSchool({ __auth, name, address, phone }) {
    if (!name || name.trim().length < 1) return { error: "name is required" };

    let result = await this.validators.createSchool({ name });
    if (result) return result;

    const school = await School.create({ name, address, phone });

    const ownerRole = await this.role.createOwnerRoleForSchool(school._id);

    await this.schoolMembership.create({
      userId: __auth.userId,
      schoolId: school._id,
      roleId: ownerRole._id,
    });

    return {
      school: school.toObject(),
      membership: { roleId: ownerRole._id, roleName: "owner" },
    };
  }

  async getSchool({ __auth, __query }) {
    const { schoolId } = __query || {};
    if (!schoolId) return { error: "schoolId is required" };

    if (
      !__auth.isSuper &&
      !this.role.hasPermission(__auth, schoolId, "school:read")
    ) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const school = await School.findById(schoolId).lean();
    if (!school) return appError("school not found", ERROR_CODES.NOT_FOUND);
    return school;
  }

  async getSchools({ __auth, __query }) {
    const pg = parsePagination(__query || {});

    let filter = {};
    if (!__auth.isSuper) {
      const schoolIds = __auth.memberships
        .filter((m) => m.schoolId)
        .map((m) => m.schoolId);
      filter = { _id: { $in: schoolIds } };
    }

    return paginate(School, filter, pg, { sort: { createdAt: -1 } });
  }

  async getSchoolStats({ __auth, __query }) {
    const { schoolId } = __query || {};
    if (!schoolId) return { error: "schoolId is required" };
    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return { error: "Invalid schoolId" };
    }

    if (
      !__auth.isSuper &&
      !this.role.hasPermission(__auth, schoolId, "school:read")
    ) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const oid = new mongoose.Types.ObjectId(schoolId);

    const [school, studentStats, resourceStats, classroomBreakdown] =
      await Promise.all([
        School.findById(oid).lean(),

        Student.aggregate([
          { $match: { schoolId: oid } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unassigned: {
                $sum: { $cond: [{ $eq: ["$classroomId", null] }, 1, 0] },
              },
            },
          },
        ]),

        Resource.aggregate([
          { $match: { schoolId: oid } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: {
                $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
              },
              schoolWide: {
                $sum: { $cond: [{ $eq: ["$classroomId", null] }, 1, 0] },
              },
            },
          },
        ]),

        Classroom.aggregate([
          { $match: { schoolId: oid } },
          {
            $lookup: {
              from: "students",
              let: { cid: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$classroomId", "$$cid"] } } },
                { $count: "n" },
              ],
              as: "_sc",
            },
          },
          {
            $lookup: {
              from: "resources",
              let: { cid: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$classroomId", "$$cid"] } } },
                { $count: "n" },
              ],
              as: "_rc",
            },
          },
          {
            $project: {
              name: 1,
              capacity: 1,
              studentCount: {
                $ifNull: [{ $arrayElemAt: ["$_sc.n", 0] }, 0],
              },
              resourceCount: {
                $ifNull: [{ $arrayElemAt: ["$_rc.n", 0] }, 0],
              },
            },
          },
          {
            $addFields: {
              utilization: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$studentCount",
                          { $max: ["$capacity", 1] },
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
            },
          },
          { $sort: { name: 1 } },
        ]),
      ]);

    if (!school) return appError("school not found", ERROR_CODES.NOT_FOUND);

    const ss = studentStats[0] || { total: 0, unassigned: 0 };
    const rs = resourceStats[0] || { total: 0, active: 0, schoolWide: 0 };

    return {
      _id: school._id,
      name: school.name,
      address: school.address,
      phone: school.phone,
      totalClassrooms: classroomBreakdown.length,
      totalStudents: ss.total,
      unassignedStudents: ss.unassigned,
      totalResources: rs.total,
      activeResources: rs.active,
      schoolWideResources: rs.schoolWide,
      classrooms: classroomBreakdown,
    };
  }

  async updateSchool({ __auth, schoolId, name, address, phone }) {
    let result = await this.validators.updateSchool({ schoolId });
    if (result) return result;

    if (!this.role.hasPermission(__auth, schoolId, "school:update")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const school = await School.findById(schoolId);
    if (!school) return appError("school not found", ERROR_CODES.NOT_FOUND);

    if (name !== undefined) school.name = name;
    if (address !== undefined) school.address = address;
    if (phone !== undefined) school.phone = phone;
    await school.save();

    return school.toObject();
  }

  async deleteSchool({ __auth, schoolId }) {
    if (!schoolId) return { error: "schoolId is required" };

    if (!this.role.hasPermission(__auth, schoolId, "school:delete")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const school = await School.findById(schoolId);
    if (!school) return appError("school not found", ERROR_CODES.NOT_FOUND);

    await Promise.all([
      Resource.deleteMany({ schoolId: school._id }),
      Student.deleteMany({ schoolId: school._id }),
      Classroom.deleteMany({ schoolId: school._id }),
      SchoolMembership.deleteMany({ schoolId: school._id }),
      Role.deleteMany({ schoolId: school._id }),
    ]);
    await school.deleteOne();

    return { message: "school and associated resources deleted" };
  }

  async addMember({ __auth, schoolId, userId, roleId }) {
    if (!schoolId || !userId || !roleId) {
      return { error: "schoolId, userId, and roleId are required" };
    }

    if (!this.role.hasPermission(__auth, schoolId, "school:manage_members")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const targetRole = await Role.findById(roleId);
    if (!targetRole) return { error: "role not found" };
    if (
      !targetRole.schoolId ||
      targetRole.schoolId.toString() !== schoolId.toString()
    ) {
      return { error: "role does not belong to this school" };
    }

    const result = await this.schoolMembership.create({
      userId,
      schoolId,
      roleId,
    });
    if (result.error) return result;

    return { message: "member added", membership: result };
  }

  async removeMember({ __auth, schoolId, userId }) {
    if (!schoolId || !userId) {
      return { error: "schoolId and userId are required" };
    }

    if (!this.role.hasPermission(__auth, schoolId, "school:manage_members")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    if (userId.toString() === __auth.userId.toString()) {
      return { error: "cannot remove yourself from school" };
    }

    return this.schoolMembership.remove({ userId, schoolId });
  }
};
