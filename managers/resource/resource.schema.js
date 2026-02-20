module.exports = {
  createResource: [
    { model: "name", required: true },
    { model: "schoolId", required: true },
  ],
  updateResource: [{ model: "id", required: true }],
};
