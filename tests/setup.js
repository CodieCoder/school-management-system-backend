const supertest = require("supertest");
const mongoose = require("mongoose");

let app, managers, request;
let booted = false;

async function getApp() {
  if (booted) return { request, managers };

  const config = require("../config/index.config");
  const connectMongo = require("../connect/mongo");
  const ManagersLoader = require("../loaders/ManagersLoader");
  const Cortex = require("ion-cortex");
  const Aeon = require("aeon-machine");

  await connectMongo({ uri: config.dotEnv.MONGO_URI });

  const cache = require("../cache/cache.dbh")({
    prefix: config.dotEnv.CACHE_PREFIX,
    url: config.dotEnv.CACHE_REDIS,
  });

  const Oyster = require("oyster-db");
  const oyster = new Oyster({
    url: config.dotEnv.OYSTER_REDIS,
    prefix: config.dotEnv.OYSTER_PREFIX,
  });

  const cortex = new Cortex({
    prefix: config.dotEnv.CORTEX_PREFIX,
    url: config.dotEnv.CORTEX_REDIS,
    type: config.dotEnv.CORTEX_TYPE,
    state: () => ({}),
    activeDelay: "50",
    idlDelay: "200",
  });

  const aeon = new Aeon({
    cortex,
    timestampFrom: Date.now(),
    segmantDuration: 500,
  });

  const loader = new ManagersLoader({ config, cache, cortex, oyster, aeon });
  managers = loader.load();

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }

  await loader.seed();

  app = managers.userServer.configure();
  request = supertest(app);

  booted = true;
  return { request, managers };
}

async function loginAs(email, password) {
  const { request: req } = await getApp();
  const res = await req.post("/api/auth/login").send({ email, password });
  if (!res.body.ok) throw new Error(`Login failed: ${res.body.message}`);
  return res.body.data.token;
}

async function getAdminToken() {
  return loginAs(
    process.env.SUPER_ADMIN_EMAIL || "admin@axion.local",
    process.env.SUPER_ADMIN_PASSWORD || "changeme123",
  );
}

module.exports = { getApp, loginAs, getAdminToken };
