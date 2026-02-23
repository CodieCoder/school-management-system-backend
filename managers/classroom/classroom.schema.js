module.exports = {
  createClassroom: [
    { model: "name", required: true },
    { model: "schoolId", required: true },
  ],
  updateClassroom: [{ model: "classroomId", required: true }],
};
