const pino = require("pino");

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

function buildTransport() {
  if (isProduction || isTest) return undefined;
  try {
    require.resolve("pino-pretty");
    return { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } };
  } catch {
    return undefined;
  }
}

const logger = pino({
  level: isTest ? "silent" : isProduction ? "info" : "debug",
  transport: buildTransport(),
});

module.exports = logger;
