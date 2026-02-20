module.exports = {
  createClassroom: [
    { model: "name", required: true },
    { model: "schoolId", required: true },
  ],
  updateClassroom: [{ model: "id", required: true }],
};
