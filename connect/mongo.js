const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const logger = require("../libs/logger");

mongoose.plugin(mongoosePaginate);

module.exports = ({ uri }) => {
  return mongoose
    .connect(uri)
    .then(() => {
      logger.info("MongoDB connected: %s", uri);
    })
    .catch((err) => {
      logger.fatal({ err }, "MongoDB connection error");
      process.exit(1);
    });
};
