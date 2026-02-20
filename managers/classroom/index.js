const Classroom = require("./classroom.mongoModel");
const Student = require("../student/student.mongoModel");
const Resource = require("../resource/resource.mongoModel");
const { parsePagination, paginate } = require("../../libs/paginate");
const { appError, ERROR_CODES } = require("../../libs/AppError");

module.exports = class ClassroomManager {
  constructor({ managers, validators }) {
    this.validators = validators.classroom;
    this.role = managers.role;

    this.httpExposed = [
      "post=createClassroom",
      "get=getClassroom",
      "get=getClassrooms",
      "put=updateClassroom",
      "delete=deleteClassroom",
    ];
  }

  _resolveSchoolId(__auth, schoolId) {
    if (schoolId) return schoolId;
    const schoolMemberships = __auth.memberships.filter((m) => m.schoolId);
    if (schoolMemberships.length === 1)
      return schoolMemberships[0].schoolId.toString();
    return null;
  }

  async createClassroom({ __auth, name, schoolId, capacity }) {
    if (!name || name.trim().length < 1) return { error: "name is required" };
    schoolId = this._resolveSchoolId(__auth, schoolId);
    if (!schoolId) return { error: "schoolId is required" };

    let result = await this.validators.createClassroom({ name, schoolId });
    if (result) return result;

    if (!this.role.hasPermission(__auth, schoolId, "classroom:create")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const existing = await Classroom.findOne({ schoolId, name });
    if (existing)
      return appError("classroom name already exists in this school", ERROR_CODES.DUPLICATE);

    const classroom = await Classroom.create({
      name,
      schoolId,
      capacity: capacity || 30,
    });

    return classroom.toObject();
  }

  async getClassroom({ __auth, __query }) {
    const { classroomId } = __query || {};
    if (!classroomId) return { error: "classroomId is required" };

    const classroom = await Classroom.findById(classroomId).lean();
    if (!classroom) return appError("classroom not found", ERROR_CODES.NOT_FOUND);

    if (
      !this.role.hasPermission(__auth, classroom.schoolId, "classroom:read")
    ) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    return classroom;
  }

  async getClassrooms({ __auth, __query }) {
    const query = __query || {};
    let { schoolId } = query;
    schoolId = this._resolveSchoolId(__auth, schoolId);
    if (!schoolId) return { error: "schoolId is required" };

    if (!this.role.hasPermission(__auth, schoolId, "classroom:read")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    return paginate(Classroom, { schoolId }, parsePagination(query), {
      sort: { name: 1 },
    });
  }

  async updateClassroom({ __auth, classroomId, name, capacity }) {
    if (!classroomId) return { error: "classroomId is required" };

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return appError("classroom not found", ERROR_CODES.NOT_FOUND);

    if (
      !this.role.hasPermission(__auth, classroom.schoolId, "classroom:update")
    ) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    if (name !== undefined) {
      const dup = await Classroom.findOne({
        schoolId: classroom.schoolId,
        name,
        _id: { $ne: classroom._id },
      });
      if (dup) return appError("classroom name already exists in this school", ERROR_CODES.DUPLICATE);
      classroom.name = name;
    }
    if (capacity !== undefined) classroom.capacity = capacity;
    await classroom.save();

    return classroom.toObject();
  }

  async deleteClassroom({ __auth, classroomId }) {
    if (!classroomId) return { error: "classroomId is required" };

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return appError("classroom not found", ERROR_CODES.NOT_FOUND);

    if (
      !this.role.hasPermission(__auth, classroom.schoolId, "classroom:delete")
    ) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    await Promise.all([
      Student.updateMany(
        { classroomId: classroom._id },
        { $set: { classroomId: null } },
      ),
      Resource.deleteMany({ classroomId: classroom._id }),
    ]);
    await classroom.deleteOne();

    return { message: "classroom deleted, students unassigned" };
  }
};
