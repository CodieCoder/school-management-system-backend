const mongoose = require("mongoose");

const SchoolMembershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
  },
  { timestamps: true },
);

SchoolMembershipSchema.index({ userId: 1, schoolId: 1 }, { unique: true });
SchoolMembershipSchema.index({ schoolId: 1 });
SchoolMembershipSchema.index({ userId: 1 });

module.exports = mongoose.model("SchoolMembership", SchoolMembershipSchema);
