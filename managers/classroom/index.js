const Classroom = require("./classroom.mongoModel");
const Student = require("../student/student.mongoModel");

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

  async createClassroom({ __auth, name, schoolId, capacity, resources }) {
    if (!name || name.trim().length < 1) return { error: "name is required" };
    schoolId = this._resolveSchoolId(__auth, schoolId);
    if (!schoolId) return { error: "schoolId is required" };

    let result = await this.validators.createClassroom({ name, schoolId });
    if (result) return result;

    if (!this.role.hasPermission(__auth, schoolId, "classroom:create")) {
      return { error: "permission denied" };
    }

    const existing = await Classroom.findOne({ schoolId, name });
    if (existing)
      return { error: "classroom name already exists in this school" };

    const classroom = await Classroom.create({
      name,
      schoolId,
      capacity: capacity || 30,
      resources: resources || [],
    });

    return classroom.toObject();
  }

  async getClassroom({ __auth, __query }) {
    const { classroomId } = __query || {};
    if (!classroomId) return { error: "classroomId is required" };

    const classroom = await Classroom.findById(classroomId).lean();
    if (!classroom) return { error: "classroom not found" };

    if (
      !this.role.hasPermission(__auth, classroom.schoolId, "classroom:read")
    ) {
      return { error: "permission denied" };
    }

    return classroom;
  }

  async getClassrooms({ __auth, __query }) {
    let { schoolId } = __query || {};
    schoolId = this._resolveSchoolId(__auth, schoolId);
    if (!schoolId) return { error: "schoolId is required" };

    if (!this.role.hasPermission(__auth, schoolId, "classroom:read")) {
      return { error: "permission denied" };
    }

    return Classroom.find({ schoolId }).lean();
  }

  async updateClassroom({ __auth, classroomId, name, capacity, resources }) {
    if (!classroomId) return { error: "classroomId is required" };

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return { error: "classroom not found" };

    if (
      !this.role.hasPermission(__auth, classroom.schoolId, "classroom:update")
    ) {
      return { error: "permission denied" };
    }

    if (name !== undefined) {
      const dup = await Classroom.findOne({
        schoolId: classroom.schoolId,
        name,
        _id: { $ne: classroom._id },
      });
      if (dup) return { error: "classroom name already exists in this school" };
      classroom.name = name;
    }
    if (capacity !== undefined) classroom.capacity = capacity;
    if (resources !== undefined) classroom.resources = resources;
    await classroom.save();

    return classroom.toObject();
  }

  async deleteClassroom({ __auth, classroomId }) {
    if (!classroomId) return { error: "classroomId is required" };

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return { error: "classroom not found" };

    if (
      !this.role.hasPermission(__auth, classroom.schoolId, "classroom:delete")
    ) {
      return { error: "permission denied" };
    }

    await Student.updateMany(
      { classroomId: classroom._id },
      { $set: { classroomId: null } },
    );
    await classroom.deleteOne();

    return { message: "classroom deleted, students unassigned" };
  }
};
