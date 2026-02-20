require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/axion';

if (mongoUri.includes('.mongodb.net')) {
    process.env.MONGO_URI = mongoUri.replace(/\.net\/[^?]*/, '.net/axion_test');
} else {
    process.env.MONGO_URI = mongoUri.replace(/\/[^/?]+(\?|$)/, '/axion_test$1');
}
