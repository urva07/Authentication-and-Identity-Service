const config = require('#src/config/config.js');


const notImplemented = (req, res) =>
    res.status(501).json({
        success: false,
        message: 'Endpoint not implemented'
    });

const createLoginController = (loginService) => ({
    get: notImplemented,
    post: async (req, res, next) => {
        try {
            const { accessToken, refreshToken, user } = await loginService.loginUser(
                req.user,
                req.log
            );
            
            res.cookie(config.auth.jwt.cookieOptions.refresh.name, refreshToken, {
                httpOnly: config.auth.jwt.cookieOptions.refresh.httpOnly,
                secure: config.auth.jwt.cookieOptions.refresh.secure,
                sameSite: config.auth.jwt.cookieOptions.refresh.sameSite,
                maxAge: config.auth.jwt.cookieOptions.refresh.maxAge,
                path: config.auth.jwt.cookieOptions.refresh.path,
            });

            res.cookie(config.auth.jwt.cookieOptions.access.name, accessToken, {
                httpOnly: config.auth.jwt.cookieOptions.access.httpOnly,
                secure: config.auth.jwt.cookieOptions.access.secure,
                sameSite: config.auth.jwt.cookieOptions.access.sameSite,
                maxAge: config.auth.jwt.cookieOptions.access.maxAge,
                path: config.auth.jwt.cookieOptions.access.path,
            });

            res.status(200).json({
                success: true,
                data: { user }
            });

            req.log.debug('Login completed', { userId: String(user.id) });

            return;

        } catch (error) {
            return next(error);
        }
    },
    put: notImplemented,
    patch: notImplemented,
    delete: notImplemented
});

module.exports = createLoginController;
