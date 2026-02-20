const mongoose = require("mongoose");
const Student = require("./student.mongoModel");
const Classroom = require("../classroom/classroom.mongoModel");
const School = require("../school/school.mongoModel");
const { parsePagination, paginate } = require("../../libs/paginate");
const { appError, ERROR_CODES } = require("../../libs/AppError");

module.exports = class StudentManager {
  constructor({ managers, validators }) {
    this.validators = validators.student;
    this.role = managers.role;

    this.httpExposed = [
      "post=createStudent",
      "get=getStudent",
      "get=getStudents",
      "put=updateStudent",
      "post=transferStudent",
      "delete=deleteStudent",
    ];
  }

  _resolveSchoolId(__auth, schoolId) {
    if (schoolId) return schoolId;
    const schoolMemberships = __auth.memberships.filter((m) => m.schoolId);
    if (schoolMemberships.length === 1)
      return schoolMemberships[0].schoolId.toString();
    return null;
  }

  async createStudent({ __auth, name, email, schoolId, classroomId }) {
    if (!name || name.trim().length < 1) return { error: "name is required" };
    schoolId = this._resolveSchoolId(__auth, schoolId);
    if (!schoolId) return { error: "schoolId is required" };

    let result = await this.validators.createStudent({ name, schoolId });
    if (result) return result;

    if (!this.role.hasPermission(__auth, schoolId, "student:create")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    if (email) {
      const dup = await Student.findOne({ email: email.toLowerCase() });
      if (dup) return appError("student email already exists", ERROR_CODES.DUPLICATE);
    }

    if (classroomId) {
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) return appError("classroom not found", ERROR_CODES.NOT_FOUND);
      if (classroom.schoolId.toString() !== schoolId.toString()) {
        return { error: "classroom does not belong to this school" };
      }

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const enrolled = await Student.countDocuments({ classroomId }).session(
          session,
        );
        if (enrolled >= classroom.capacity) {
          await session.abortTransaction();
          session.endSession();
          return appError("classroom is at full capacity", ERROR_CODES.CAPACITY_FULL);
        }
        const [student] = await Student.create(
          [{ name, email: email || "", schoolId, classroomId }],
          { session },
        );
        await session.commitTransaction();
        session.endSession();
        return student.toObject();
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    }

    const student = await Student.create({
      name,
      email: email || "",
      schoolId,
      classroomId: null,
    });

    return student.toObject();
  }

  async getStudent({ __auth, __query }) {
    const { studentId } = __query || {};
    if (!studentId) return { error: "studentId is required" };

    const student = await Student.findById(studentId)
      .populate("classroomId", "name")
      .lean();
    if (!student) return appError("student not found", ERROR_CODES.NOT_FOUND);

    if (!this.role.hasPermission(__auth, student.schoolId, "student:read")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    return student;
  }

  async getStudents({ __auth, __query }) {
    const query = __query || {};
    let { schoolId, classroomId } = query;
    schoolId = this._resolveSchoolId(__auth, schoolId);
    if (!schoolId) return { error: "schoolId is required" };

    if (!this.role.hasPermission(__auth, schoolId, "student:read")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const filter = { schoolId };
    if (classroomId) filter.classroomId = classroomId;

    return paginate(Student, filter, parsePagination(query), {
      populate: { path: "classroomId", select: "name" },
      sort: { name: 1 },
    });
  }

  async updateStudent({ __auth, studentId, name, email, classroomId }) {
    if (!studentId) return { error: "studentId is required" };

    const student = await Student.findById(studentId);
    if (!student) return appError("student not found", ERROR_CODES.NOT_FOUND);

    if (!this.role.hasPermission(__auth, student.schoolId, "student:update")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    if (name !== undefined) student.name = name;
    if (email !== undefined) {
      if (email) {
        const dup = await Student.findOne({
          email: email.toLowerCase(),
          _id: { $ne: student._id },
        });
        if (dup) return appError("student email already exists", ERROR_CODES.DUPLICATE);
      }
      student.email = email;
    }

    if (classroomId !== undefined) {
      if (classroomId === null || classroomId === "") {
        student.classroomId = null;
        await student.save();
        return student.toObject();
      }

      const classroom = await Classroom.findById(classroomId);
      if (!classroom) return appError("classroom not found", ERROR_CODES.NOT_FOUND);
      if (classroom.schoolId.toString() !== student.schoolId.toString()) {
        return { error: "classroom does not belong to this school" };
      }

      if (String(student.classroomId) !== String(classroomId)) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const enrolled = await Student.countDocuments({
            classroomId,
          }).session(session);
          if (enrolled >= classroom.capacity) {
            await session.abortTransaction();
            session.endSession();
            return appError("classroom is at full capacity", ERROR_CODES.CAPACITY_FULL);
          }
          student.classroomId = classroomId;
          await student.save({ session });
          await session.commitTransaction();
          session.endSession();
          return student.toObject();
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }

      student.classroomId = classroomId;
    }

    await student.save();
    return student.toObject();
  }

  async transferStudent({ __auth, studentId, newSchoolId, newClassroomId }) {
    if (!studentId || !newSchoolId) {
      return { error: "studentId and newSchoolId are required" };
    }

    if (!this.role.hasGlobalPermission(__auth, "student:transfer")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    const student = await Student.findById(studentId);
    if (!student) return appError("student not found", ERROR_CODES.NOT_FOUND);

    if (student.schoolId.toString() === newSchoolId.toString()) {
      return { error: "cannot transfer to the same school" };
    }

    const newSchool = await School.findById(newSchoolId);
    if (!newSchool) return appError("target school not found", ERROR_CODES.NOT_FOUND);

    if (newClassroomId) {
      const classroom = await Classroom.findById(newClassroomId);
      if (!classroom) return { error: "target classroom not found" };
      if (classroom.schoolId.toString() !== newSchoolId.toString()) {
        return { error: "classroom does not belong to target school" };
      }
      student.classroomId = newClassroomId;
    } else {
      student.classroomId = null;
    }

    student.schoolId = newSchoolId;
    await student.save();

    return student.toObject();
  }

  async deleteStudent({ __auth, studentId }) {
    if (!studentId) return { error: "studentId is required" };

    const student = await Student.findById(studentId);
    if (!student) return appError("student not found", ERROR_CODES.NOT_FOUND);

    if (!this.role.hasPermission(__auth, student.schoolId, "student:delete")) {
      return appError("permission denied", ERROR_CODES.PERMISSION_DENIED);
    }

    await student.deleteOne();
    return { message: "student deleted" };
  }
};
