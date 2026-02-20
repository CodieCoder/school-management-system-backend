const MiddlewaresLoader = require("./MiddlewaresLoader");
const ApiHandler = require("../managers/api/Api.manager");
const LiveDB = require("../managers/live_db/LiveDb.manager");
const UserServer = require("../managers/http/UserServer.manager");
const ResponseDispatcher = require("../managers/response_dispatcher/ResponseDispatcher.manager");
const VirtualStack = require("../managers/virtual_stack/VirtualStack.manager");
const ValidatorsLoader = require("./ValidatorsLoader");
const ResourceMeshLoader = require("./ResourceMeshLoader");
const MongoLoader = require("./MongoLoader");
const utils = require("../libs/utils");
const logger = require("../libs/logger");

const PermissionManager = require("../managers/permission/index");
const RoleManager = require("../managers/role/index");
const UserManager = require("../managers/user/index");
const SchoolManager = require("../managers/school/index");
const SchoolMembershipManager = require("../managers/school_membership/index");
const AuthManager = require("../managers/auth/index");
const ClassroomManager = require("../managers/classroom/index");
const StudentManager = require("../managers/student/index");
const ResourceManager = require("../managers/resource/index");
const AuthCacheInvalidator = require("../libs/authCacheInvalidator");
const HealthManager = require("../managers/health/index");

module.exports = class ManagersLoader {
  constructor({ config, cortex, cache, oyster, aeon }) {
    this.managers = {};
    this.config = config;
    this.cache = cache;
    this.cortex = cortex;

    this._preload();
    this.injectable = {
      utils,
      cache,
      config,
      cortex,
      oyster,
      aeon,
      managers: this.managers,
      validators: this.validators,
      mongomodels: this.mongomodels,
      resourceNodes: this.resourceNodes,
    };
  }

  _preload() {
    const validatorsLoader = new ValidatorsLoader({
      models: require("../managers/_common/schema.models"),
      customValidators: require("../managers/_common/schema.validators"),
    });
    const resourceMeshLoader = new ResourceMeshLoader({});
    const mongoLoader = new MongoLoader({ schemaExtension: "mongoModel.js" });

    this.validators = validatorsLoader.load();
    this.resourceNodes = resourceMeshLoader.load();
    this.mongomodels = mongoLoader.load();
  }

  load() {
    this.managers.responseDispatcher = new ResponseDispatcher();
    this.managers.liveDb = new LiveDB(this.injectable);

    const middlewaresLoader = new MiddlewaresLoader(this.injectable);
    const mwsRepo = middlewaresLoader.load();
    this.injectable.mwsRepo = mwsRepo;

    this.managers.authCacheInvalidator = new AuthCacheInvalidator({
      cache: this.cache,
    });
    this.managers.permission = new PermissionManager();
    this.managers.schoolMembership = new SchoolMembershipManager(
      this.injectable,
    );
    this.managers.user = new UserManager(this.injectable);
    this.managers.role = new RoleManager(this.injectable);
    this.managers.school = new SchoolManager(this.injectable);
    this.managers.auth = new AuthManager(this.injectable);
    this.managers.classroom = new ClassroomManager(this.injectable);
    this.managers.student = new StudentManager(this.injectable);
    this.managers.resource = new ResourceManager(this.injectable);

    this.managers.mwsExec = new VirtualStack({
      ...{ preStack: ["__device"] },
      ...this.injectable,
    });
    this.managers.userApi = new ApiHandler({
      ...this.injectable,
      prop: "httpExposed",
    });
    this.managers.health = new HealthManager({ cache: this.cache });
    this.managers.userServer = new UserServer({
      config: this.config,
      managers: this.managers,
    });

    return this.managers;
  }

  async seed() {
    await this.managers.permission.seed();
    await this.managers.role.seed();
    await this.managers.auth.seedSuperAdmin();
    logger.info("Database seeded");
  }
};
