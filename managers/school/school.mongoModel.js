const mongoose = require("mongoose");

const SchoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { timestamps: true },
);

SchoolSchema.index({ name: 1 });

module.exports = mongoose.model("School", SchoolSchema);
