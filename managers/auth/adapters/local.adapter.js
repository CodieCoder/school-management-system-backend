const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const AuthIdentity = require("../auth_identity.mongoModel");
const { appError, ERROR_CODES } = require("../../../libs/AppError");

const SALT_ROUNDS = 10;

module.exports = class LocalAuthAdapter {
  constructor({ config }) {
    this.longTokenSecret = config.dotEnv.LONG_TOKEN_SECRET;
    this.shortTokenSecret = config.dotEnv.SHORT_TOKEN_SECRET;
  }

  async register({ email, password }) {
    const existing = await AuthIdentity.findOne({ email: email.toLowerCase() });
    if (existing) return appError("email already exists", ERROR_CODES.DUPLICATE);

    const authId = nanoid();
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    await AuthIdentity.create({
      authId,
      email: email.toLowerCase(),
      password: hash,
    });

    const token = this._signToken({ authId });
    return { authId, email, token };
  }

  async login({ email, password }) {
    const identity = await AuthIdentity.findOne({ email: email.toLowerCase() });
    if (!identity) return { error: "invalid credentials" };

    const match = await bcrypt.compare(password, identity.password);
    if (!match) return { error: "invalid credentials" };

    const token = this._signToken({ authId: identity.authId });
    return { authId: identity.authId, email: identity.email, token };
  }

  verifyToken({ token }) {
    try {
      const decoded = jwt.verify(token, this.longTokenSecret);
      return { authId: decoded.authId };
    } catch (err) {
      return null;
    }
  }

  async deleteUser({ authId }) {
    await AuthIdentity.findOneAndDelete({ authId });
    return { success: true };
  }

  _signToken({ authId }) {
    return jwt.sign({ authId }, this.longTokenSecret, { expiresIn: "3y" });
  }
};
