module.exports = ({ managers }) => {
    return async ({ req, res, next }) => {
        const token = req.headers.token;
        if (!token) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false, code: 401, message: 'token required',
            });
        }

        const authResult = managers.auth.verifyToken({ token });
        if (!authResult) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false, code: 401, message: 'invalid token',
            });
        }

        const user = await managers.user.getByAuthId({ authId: authResult.authId });
        if (!user) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false, code: 401, message: 'user not found',
            });
        }

        const memberships = await managers.schoolMembership.getMemberships({ userId: user._id });

        const isSuper = memberships.some(
            m => m.isGlobal && m.permissions.includes('*:*')
        );

        next({
            userId: user._id,
            authId: authResult.authId,
            displayName: user.displayName,
            memberships,
            isSuper,
        });
    };
};
