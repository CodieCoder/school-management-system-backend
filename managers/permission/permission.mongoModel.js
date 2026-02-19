const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
    key:         { type: String, required: true, unique: true },
    resource:    { type: String, required: true },
    action:      { type: String, required: true },
    description: { type: String, default: '' },
    category:    { type: String, default: '' },
});

module.exports = mongoose.model('Permission', PermissionSchema);
