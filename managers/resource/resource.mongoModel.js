const mongoose = require("mongoose");

const ResourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
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
    isActive: { type: Boolean, default: true },
    quantity: { type: Number, default: 1, min: 0 },
    description: { type: String, default: "" },
    extraData: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

ResourceSchema.index({ schoolId: 1, classroomId: 1, name: 1 }, { unique: true });
ResourceSchema.index({ schoolId: 1, isActive: 1 });

module.exports = mongoose.model("Resource", ResourceSchema);
