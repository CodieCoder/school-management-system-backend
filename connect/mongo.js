const mongoose = require('mongoose');

module.exports = ({ uri }) => {
    return mongoose.connect(uri).then(() => {
        console.log('MongoDB connected: ' + uri);
    }).catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
};
