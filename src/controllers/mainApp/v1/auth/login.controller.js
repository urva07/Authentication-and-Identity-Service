const config = require('#src/config/config.js');
const logger = require('#src/utils/logger.js');
const notImplemented = (req, res) =>
    res.status(501).json({
        success: false,
        message: 'Endpoint not implemented'
    });

const createLoginController = (loginService) => ({
    get: notImplemented,
    post: async (req, res, next) => {
        try {
            const { accessToken, refreshToken, user } = await loginService.loginUser(req.body);
            
            res.cookie(config.auth.jwt.jwtRefreshTokenCookieName, refreshToken, {
                httpOnly: true,
                secure: config.app.environment === 'production',
                sameSite: 'lax',
                maxAge: config.auth.jwt.jwtRefreshTokenCookieExpirationMili,
                path: '/',
            });

            res.cookie(config.auth.jwt.jwtAccessTokenCookieName, accessToken, {
                httpOnly: false,
                secure: config.app.environment === 'production',
                sameSite: 'lax',
                maxAge: config.auth.jwt.jwtAccessTokenCookieExpirationMili,
                path: '/',
            });

            res.status(200).json({
                success: true,
                data: { user }
            });

            logger.debug('Login completed', { userId: String(user.id) });

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
