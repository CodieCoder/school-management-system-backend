const mongoose = require("mongoose");

const AuthIdentitySchema = new mongoose.Schema(
  {
    authId: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AuthIdentity", AuthIdentitySchema);
