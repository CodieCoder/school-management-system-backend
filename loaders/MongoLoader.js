const loader = require("./_common/fileLoader");

module.exports = class MongoLoader {
  constructor({ schemaExtension }) {
    this.schemaExtension = schemaExtension;
  }

  load() {
    const models = loader(`./managers/**/*.${this.schemaExtension}`);
    return models;
  }
};
