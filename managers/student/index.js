const Student = require("./student.mongoModel");
const Classroom = require("../classroom/classroom.mongoModel");
const School = require("../school/school.mongoModel");

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
      return { error: "permission denied" };
    }

    if (classroomId) {
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) return { error: "classroom not found" };
      if (classroom.schoolId.toString() !== schoolId.toString()) {
        return { error: "classroom does not belong to this school" };
      }
      const enrolled = await Student.countDocuments({ classroomId });
      if (enrolled >= classroom.capacity) {
        return { error: "classroom is at full capacity" };
      }
    }

    if (email) {
      const dup = await Student.findOne({ email: email.toLowerCase() });
      if (dup) return { error: "student email already exists" };
    }

    const student = await Student.create({
      name,
      email: email || "",
      schoolId,
      classroomId: classroomId || null,
    });

    return student.toObject();
  }

  async getStudent({ __auth, __query }) {
    const { studentId } = __query || {};
    if (!studentId) return { error: "studentId is required" };

    const student = await Student.findById(studentId)
      .populate("classroomId", "name")
      .lean();
    if (!student) return { error: "student not found" };

    if (!this.role.hasPermission(__auth, student.schoolId, "student:read")) {
      return { error: "permission denied" };
    }

    return student;
  }

  async getStudents({ __auth, __query }) {
    const query = __query || {};
    let { schoolId, classroomId } = query;
    schoolId = this._resolveSchoolId(__auth, schoolId);
    if (!schoolId) return { error: "schoolId is required" };

    if (!this.role.hasPermission(__auth, schoolId, "student:read")) {
      return { error: "permission denied" };
    }

    const filter = { schoolId };
    if (classroomId) filter.classroomId = classroomId;

    const { parsePagination, paginate } = require("../../libs/paginate");
    return paginate(Student, filter, parsePagination(query), {
      populate: { path: "classroomId", select: "name" },
      sort: { name: 1 },
    });
  }

  async updateStudent({ __auth, studentId, name, email, classroomId }) {
    if (!studentId) return { error: "studentId is required" };

    const student = await Student.findById(studentId);
    if (!student) return { error: "student not found" };

    if (!this.role.hasPermission(__auth, student.schoolId, "student:update")) {
      return { error: "permission denied" };
    }

    if (classroomId !== undefined) {
      if (classroomId === null || classroomId === "") {
        student.classroomId = null;
      } else {
        const classroom = await Classroom.findById(classroomId);
        if (!classroom) return { error: "classroom not found" };
        if (classroom.schoolId.toString() !== student.schoolId.toString()) {
          return { error: "classroom does not belong to this school" };
        }
        if (String(student.classroomId) !== String(classroomId)) {
          const enrolled = await Student.countDocuments({ classroomId });
          if (enrolled >= classroom.capacity) {
            return { error: "classroom is at full capacity" };
          }
        }
        student.classroomId = classroomId;
      }
    }

    if (name !== undefined) student.name = name;
    if (email !== undefined) {
      if (email) {
        const dup = await Student.findOne({
          email: email.toLowerCase(),
          _id: { $ne: student._id },
        });
        if (dup) return { error: "student email already exists" };
      }
      student.email = email;
    }
    await student.save();

    return student.toObject();
  }

  async transferStudent({ __auth, studentId, newSchoolId, newClassroomId }) {
    if (!studentId || !newSchoolId) {
      return { error: "studentId and newSchoolId are required" };
    }

    if (!this.role.hasGlobalPermission(__auth, "student:transfer")) {
      return { error: "permission denied" };
    }

    const student = await Student.findById(studentId);
    if (!student) return { error: "student not found" };

    if (student.schoolId.toString() === newSchoolId.toString()) {
      return { error: "cannot transfer to the same school" };
    }

    const newSchool = await School.findById(newSchoolId);
    if (!newSchool) return { error: "target school not found" };

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
    if (!student) return { error: "student not found" };

    if (!this.role.hasPermission(__auth, student.schoolId, "student:delete")) {
      return { error: "permission denied" };
    }

    await student.deleteOne();
    return { message: "student deleted" };
  }
};
