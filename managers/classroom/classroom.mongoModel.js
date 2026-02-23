const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

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
ClassroomSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Classroom", ClassroomSchema);
