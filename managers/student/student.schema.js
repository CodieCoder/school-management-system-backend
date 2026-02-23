module.exports = {
  createStudent: [
    { model: "name", required: true },
    { model: "schoolId", required: true },
  ],
  updateStudent: [{ model: "studentId", required: true }],
  transferStudent: [
    { model: "studentId", required: true },
    { model: "newSchoolId", required: true },
  ],
};
