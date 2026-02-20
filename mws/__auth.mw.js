const AUTH_CACHE_TTL = 300; // 5 minutes

module.exports = ({ managers, cache }) => {
  return async ({ req, res, next }) => {
    const token = req.headers.token;
    if (!token) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        message: "token required",
      });
    }

    const authResult = managers.auth.verifyToken({ token });
    if (!authResult) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        message: "invalid token",
      });
    }

    const cacheKey = `auth:${authResult.authId}`;

    try {
      const cached = await cache.key.get({ key: cacheKey });
      if (cached && cached !== "null") {
        return next(JSON.parse(cached));
      }
    } catch {
      /* cache miss or redis down — fall through to DB. We are letting it fail silently. */
    }

    const user = await managers.user.getByAuthId({ authId: authResult.authId });
    if (!user) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        message: "user not found",
      });
    }

    const memberships = await managers.schoolMembership.getMemberships({
      userId: user._id,
    });

    const isSuper = memberships.some(
      (m) => m.isGlobal && m.permissions.includes("*:*"),
    );

    const authContext = {
      userId: user._id,
      authId: authResult.authId,
      displayName: user.displayName,
      memberships,
      isSuper,
    };

    try {
      await cache.key.set({
        key: cacheKey,
        data: JSON.stringify(authContext),
        ttl: AUTH_CACHE_TTL,
      });
    } catch {
      /* cache write failed --> non-fatal */
    }

    next(authContext);
  };
};
