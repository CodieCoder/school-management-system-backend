module.exports = class ResponseDispatcher {
  constructor() {
    this.key = "responseDispatcher";
  }
  dispatch(res, { ok, data, status, code, errors, message, msg }) {
    let statusCode =
      status ? status
      : ok == true ? 200
      : 400;
    const body = {
      ok: ok || false,
      data: data || {},
      errors: errors || [],
      message: msg || message || "",
    };
    if (code) body.code = code;
    return res.status(statusCode).send(body);
  }
};
