const ERROR_CODES = {
  VALIDATION: { status: 400, code: "VALIDATION_ERROR" },
  NOT_FOUND: { status: 404, code: "NOT_FOUND" },
  DUPLICATE: { status: 409, code: "DUPLICATE" },
  PERMISSION_DENIED: { status: 403, code: "PERMISSION_DENIED" },
  UNAUTHORIZED: { status: 401, code: "UNAUTHORIZED" },
  CAPACITY_FULL: { status: 422, code: "CAPACITY_FULL" },
  INVALID_ID: { status: 400, code: "INVALID_ID" },
  INTERNAL: { status: 500, code: "INTERNAL_ERROR" },
};

class AppError {
  constructor(message, errorType = ERROR_CODES.VALIDATION) {
    this.error = message;
    this.status = errorType.status;
    this.code = errorType.code;
  }
}

function appError(message, errorType) {
  return new AppError(message, errorType);
}

module.exports = { AppError, appError, ERROR_CODES };
