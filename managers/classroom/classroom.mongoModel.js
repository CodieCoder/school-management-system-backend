const mongoose = require("mongoose");

const ClassroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    capacity: { type: Number, default: 30, min: 1 },
  },
  { timestamps: true },
);

ClassroomSchema.index({ schoolId: 1 });
ClassroomSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Classroom", ClassroomSchema);
