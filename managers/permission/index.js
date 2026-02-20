const Permission = require("./permission.mongoModel");

const SEED = [
  {
    key: "school:create",
    resource: "school",
    action: "create",
    description: "Create new schools",
    category: "Schools",
  },
  {
    key: "school:read",
    resource: "school",
    action: "read",
    description: "View school details",
    category: "Schools",
  },
  {
    key: "school:update",
    resource: "school",
    action: "update",
    description: "Update school information",
    category: "Schools",
  },
  {
    key: "school:delete",
    resource: "school",
    action: "delete",
    description: "Delete schools",
    category: "Schools",
  },
  {
    key: "school:manage_roles",
    resource: "school",
    action: "manage_roles",
    description: "Create/edit/delete roles for a school",
    category: "Schools",
  },
  {
    key: "school:manage_members",
    resource: "school",
    action: "manage_members",
    description: "Invite/remove users, assign roles",
    category: "Schools",
  },
  {
    key: "user:create",
    resource: "user",
    action: "create",
    description: "Create user accounts",
    category: "Users",
  },
  {
    key: "user:read",
    resource: "user",
    action: "read",
    description: "View user profiles",
    category: "Users",
  },
  {
    key: "user:update",
    resource: "user",
    action: "update",
    description: "Update user information",
    category: "Users",
  },
  {
    key: "user:delete",
    resource: "user",
    action: "delete",
    description: "Delete user accounts",
    category: "Users",
  },
  {
    key: "classroom:create",
    resource: "classroom",
    action: "create",
    description: "Create classrooms",
    category: "Classrooms",
  },
  {
    key: "classroom:read",
    resource: "classroom",
    action: "read",
    description: "View classrooms",
    category: "Classrooms",
  },
  {
    key: "classroom:update",
    resource: "classroom",
    action: "update",
    description: "Update classrooms",
    category: "Classrooms",
  },
  {
    key: "classroom:delete",
    resource: "classroom",
    action: "delete",
    description: "Delete classrooms",
    category: "Classrooms",
  },
  {
    key: "student:create",
    resource: "student",
    action: "create",
    description: "Enroll students",
    category: "Students",
  },
  {
    key: "student:read",
    resource: "student",
    action: "read",
    description: "View student profiles",
    category: "Students",
  },
  {
    key: "student:update",
    resource: "student",
    action: "update",
    description: "Update student information",
    category: "Students",
  },
  {
    key: "student:delete",
    resource: "student",
    action: "delete",
    description: "Remove students",
    category: "Students",
  },
  {
    key: "student:transfer",
    resource: "student",
    action: "transfer",
    description: "Transfer students between schools",
    category: "Students",
  },
];

module.exports = class PermissionManager {
  constructor() {
    this.httpExposed = ["get=getPermissions"];
    this.permissionKeys = new Set();
  }

  async seed() {
    for (const perm of SEED) {
      await Permission.findOneAndUpdate({ key: perm.key }, perm, {
        upsert: true,
        returnDocument: "after",
      });
    }
    const all = await Permission.find({});
    this.permissionKeys = new Set(all.map((p) => p.key));
  }

  isValidKey(key) {
    return this.permissionKeys.has(key);
  }

  async getPermissions() {
    const permissions = await Permission.find({}).lean();
    return permissions;
  }
};
