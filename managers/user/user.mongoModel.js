const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    authId:      { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
