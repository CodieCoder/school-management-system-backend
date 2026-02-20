const mongoose = require("mongoose");
const { Router } = require("express");

module.exports = class HealthManager {
  constructor({ cache }) {
    this.cache = cache;
    this.router = Router();
    this._registerRoutes();
  }

  _registerRoutes() {
    this.router.get("/health", async (_req, res) => {
      const mongoReady = mongoose.connection.readyState === 1;

      let redisReady = false;
      try {
        await this.cache.key.set({ key: "health:ping", data: "1", ttl: 10 });
        redisReady = true;
      } catch {
        redisReady = false;
      }

      const healthy = mongoReady && redisReady;
      res.status(healthy ? 200 : 503).json({
        ok: healthy,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        mongo: mongoReady ? "connected" : "disconnected",
        redis: redisReady ? "connected" : "disconnected",
      });
    });
  }
};
