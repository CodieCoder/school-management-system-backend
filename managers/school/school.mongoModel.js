const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const SchoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { timestamps: true },
);

SchoolSchema.index({ name: 1 });
SchoolSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("School", SchoolSchema);
