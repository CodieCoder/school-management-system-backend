const mongoose = require("mongoose");
const School = require("./school.mongoModel");
const Role = require("../role/role.mongoModel");
const SchoolMembership = require("../school_membership/school_membership.mongoModel");
const Classroom = require("../classroom/classroom.mongoModel");
const Student = require("../student/student.mongoModel");
const Resource = require("../resource/resource.mongoModel");

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
      return { error: "permission denied" };
    }

    const school = await School.findById(schoolId).lean();
    if (!school) return { error: "school not found" };
    return school;
  }

  async getSchools({ __auth, __query }) {
    const { parsePagination, paginate } = require("../../libs/paginate");
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
      return { error: "permission denied" };
    }

    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(schoolId) } },
      {
        $lookup: {
          from: "classrooms",
          localField: "_id",
          foreignField: "schoolId",
          as: "classrooms",
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "schoolId",
          as: "students",
        },
      },
      {
        $lookup: {
          from: "resources",
          localField: "_id",
          foreignField: "schoolId",
          as: "resources",
        },
      },
      {
        $addFields: {
          totalClassrooms: { $size: "$classrooms" },
          totalStudents: { $size: "$students" },
          unassignedStudents: {
            $size: {
              $filter: {
                input: "$students",
                cond: { $eq: ["$$this.classroomId", null] },
              },
            },
          },
          totalResources: { $size: "$resources" },
          activeResources: {
            $size: {
              $filter: {
                input: "$resources",
                cond: { $eq: ["$$this.isActive", true] },
              },
            },
          },
          schoolWideResources: {
            $size: {
              $filter: {
                input: "$resources",
                cond: { $eq: ["$$this.classroomId", null] },
              },
            },
          },
          classrooms: {
            $map: {
              input: "$classrooms",
              as: "c",
              in: {
                _id: "$$c._id",
                name: "$$c.name",
                capacity: "$$c.capacity",
                studentCount: {
                  $size: {
                    $filter: {
                      input: "$students",
                      cond: { $eq: ["$$this.classroomId", "$$c._id"] },
                    },
                  },
                },
                resourceCount: {
                  $size: {
                    $filter: {
                      input: "$resources",
                      cond: { $eq: ["$$this.classroomId", "$$c._id"] },
                    },
                  },
                },
                utilization: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            {
                              $size: {
                                $filter: {
                                  input: "$students",
                                  cond: {
                                    $eq: ["$$this.classroomId", "$$c._id"],
                                  },
                                },
                              },
                            },
                            { $max: ["$$c.capacity", 1] },
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
          },
        },
      },
      { $project: { students: 0, resources: 0 } },
    ];

    const results = await School.aggregate(pipeline);
    if (!results.length) return { error: "school not found" };
    return results[0];
  }

  async updateSchool({ __auth, schoolId, name, address, phone }) {
    let result = await this.validators.updateSchool({ schoolId });
    if (result) return result;

    if (!this.role.hasPermission(__auth, schoolId, "school:update")) {
      return { error: "permission denied" };
    }

    const school = await School.findById(schoolId);
    if (!school) return { error: "school not found" };

    if (name !== undefined) school.name = name;
    if (address !== undefined) school.address = address;
    if (phone !== undefined) school.phone = phone;
    await school.save();

    return school.toObject();
  }

  async deleteSchool({ __auth, schoolId }) {
    if (!schoolId) return { error: "schoolId is required" };

    if (!this.role.hasPermission(__auth, schoolId, "school:delete")) {
      return { error: "permission denied" };
    }

    const school = await School.findById(schoolId);
    if (!school) return { error: "school not found" };

    await Resource.deleteMany({ schoolId: school._id });
    await Student.deleteMany({ schoolId: school._id });
    await Classroom.deleteMany({ schoolId: school._id });
    await SchoolMembership.deleteMany({ schoolId: school._id });
    await Role.deleteMany({ schoolId: school._id });
    await school.deleteOne();

    return { message: "school and associated resources deleted" };
  }

  async addMember({ __auth, schoolId, userId, roleId }) {
    if (!schoolId || !userId || !roleId) {
      return { error: "schoolId, userId, and roleId are required" };
    }

    if (!this.role.hasPermission(__auth, schoolId, "school:manage_members")) {
      return { error: "permission denied" };
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
      return { error: "permission denied" };
    }

    if (userId.toString() === __auth.userId.toString()) {
      return { error: "cannot remove yourself from school" };
    }

    return this.schoolMembership.remove({ userId, schoolId });
  }
};
