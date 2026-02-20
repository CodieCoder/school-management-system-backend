module.exports = {
  testEnvironment: "node",
  setupFiles: ["./tests/env.setup.js"],
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 30000,
  verbose: true,
  maxWorkers: 1,
};
