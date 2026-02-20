const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      default: null,
    },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

StudentSchema.index({ schoolId: 1, classroomId: 1 });
StudentSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { email: { $ne: "" } },
  },
);

module.exports = mongoose.model("Student", StudentSchema);
