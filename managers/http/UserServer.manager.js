const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const RATE_LIMIT_RESPONSE = {
  ok: false,
  message: "too many requests, please try again later",
};

module.exports = class UserServer {
  constructor({ config, managers }) {
    this.config = config;
    this.userApi = managers.userApi;
    this.app = express();
  }

  /** for injecting middlewares */
  use(args) {
    this.app.use(args);
  }

  /** set up express middleware and routes without listening */
  configure() {
    this.app.use(helmet());
    this.app.use(cors({ origin: "*" }));
    this.app.use(express.json({ limit: "50kb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50kb" }));
    this.app.use(mongoSanitize());
    this.app.use((req, _res, next) => {
      const trimStrings = (obj) => {
        if (!obj || typeof obj !== "object") return obj;
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === "string") obj[key] = obj[key].trim();
          else if (typeof obj[key] === "object" && obj[key] !== null)
            trimStrings(obj[key]);
        }
        return obj;
      };
      if (req.body) trimStrings(req.body);
      if (req.query) trimStrings(req.query);
      next();
    });
    this.app.use("/static", express.static("public"));

    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: RATE_LIMIT_RESPONSE,
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: RATE_LIMIT_RESPONSE,
    });

    this.app.use("/api", globalLimiter);
    this.app.use("/api/auth", authLimiter);
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    this.app.all("/api/:moduleName/:fnName", this.userApi.mw);
    this.app.use((err, req, res, next) => {
      if (err.type === "entity.parse.failed") {
        return res.status(400).json({ ok: false, message: "invalid JSON" });
      }
      if (err.type === "entity.too.large") {
        return res
          .status(413)
          .json({ ok: false, message: "request body too large" });
      }
      console.error(err.stack);
      res.status(500).json({ ok: false, message: "internal server error" });
    });
    return this.app;
  }

  /** server configs */
  run() {
    this.configure();
    this.server = http.createServer(this.app);
    this.server.listen(this.config.dotEnv.USER_PORT, () => {
      console.log(
        `${this.config.dotEnv.SERVICE_NAME.toUpperCase()} is running on port: ${this.config.dotEnv.USER_PORT}`,
      );
    });
    return this.server;
  }
};
