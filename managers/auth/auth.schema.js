module.exports = {
  login: [
    { model: "email", required: true },
    { model: "password", required: true },
  ],
  register: [
    { model: "email", required: true },
    { model: "password", required: true },
    { model: "displayName", required: true },
  ],
};
