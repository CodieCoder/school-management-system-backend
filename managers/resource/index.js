const Resource = require("./resource.mongoModel");
const Classroom = require("../classroom/classroom.mongoModel");

module.exports = class ResourceManager {
  constructor({ managers, validators }) {
    this.validators = validators.resource;
    this.role = managers.role;

    this.httpExposed = [
      "post=createResource",
      "get=getResource",
      "get=getResources",
      "put=updateResource",
      "delete=deleteResource",
    ];
  }

  async createResource({
    __auth,
    name,
    schoolId,
    classroomId,
    isActive,
    quantity,
    description,
    extraData,
  }) {
    if (!name || name.trim().length < 1) return { error: "name is required" };
    if (!schoolId) return { error: "schoolId is required" };

    let result = await this.validators.createResource({ name, schoolId });
    if (result) return result;

    if (!this.role.hasPermission(__auth, schoolId, "resource:create")) {
      return { error: "permission denied" };
    }

    if (classroomId) {
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) return { error: "classroom not found" };
      if (classroom.schoolId.toString() !== schoolId.toString()) {
        return { error: "classroom does not belong to this school" };
      }
    }

    const resource = await Resource.create({
      name,
      schoolId,
      classroomId: classroomId || null,
      isActive: isActive !== undefined ? isActive : true,
      quantity: quantity || 1,
      description: description || "",
      extraData: extraData || {},
    });

    return resource.toObject();
  }

  async getResource({ __auth, __query }) {
    const { resourceId } = __query || {};
    if (!resourceId) return { error: "resourceId is required" };

    const resource = await Resource.findById(resourceId)
      .populate("classroomId", "name")
      .lean();
    if (!resource) return { error: "resource not found" };

    if (!this.role.hasPermission(__auth, resource.schoolId, "resource:read")) {
      return { error: "permission denied" };
    }

    return resource;
  }

  async getResources({ __auth, __query }) {
    const { schoolId, classroomId } = __query || {};
    if (!schoolId) return { error: "schoolId is required" };

    if (!this.role.hasPermission(__auth, schoolId, "resource:read")) {
      return { error: "permission denied" };
    }

    const filter = { schoolId };
    if (classroomId === "null" || classroomId === "") {
      filter.classroomId = null;
    } else if (classroomId) {
      filter.classroomId = classroomId;
    }

    return Resource.find(filter).populate("classroomId", "name").lean();
  }

  async updateResource({
    __auth,
    resourceId,
    name,
    classroomId,
    isActive,
    quantity,
    description,
    extraData,
  }) {
    if (!resourceId) return { error: "resourceId is required" };

    const resource = await Resource.findById(resourceId);
    if (!resource) return { error: "resource not found" };

    if (
      !this.role.hasPermission(__auth, resource.schoolId, "resource:update")
    ) {
      return { error: "permission denied" };
    }

    if (classroomId !== undefined) {
      if (classroomId === null || classroomId === "") {
        resource.classroomId = null;
      } else {
        const classroom = await Classroom.findById(classroomId);
        if (!classroom) return { error: "classroom not found" };
        if (classroom.schoolId.toString() !== resource.schoolId.toString()) {
          return { error: "classroom does not belong to this school" };
        }
        resource.classroomId = classroomId;
      }
    }

    if (name !== undefined) resource.name = name;
    if (isActive !== undefined) resource.isActive = isActive;
    if (quantity !== undefined) resource.quantity = quantity;
    if (description !== undefined) resource.description = description;
    if (extraData !== undefined) resource.extraData = extraData;
    await resource.save();

    return resource.toObject();
  }

  async deleteResource({ __auth, resourceId }) {
    if (!resourceId) return { error: "resourceId is required" };

    const resource = await Resource.findById(resourceId);
    if (!resource) return { error: "resource not found" };

    if (
      !this.role.hasPermission(__auth, resource.schoolId, "resource:delete")
    ) {
      return { error: "permission denied" };
    }

    await resource.deleteOne();
    return { message: "resource deleted" };
  }
};
