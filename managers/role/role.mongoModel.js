const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    permissions: [{ type: String }],
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
    },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

RoleSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Role", RoleSchema);
