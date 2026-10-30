const config = require('#src/config/config.js');

const createLogoutController = (logoutService) => ({
    post: async (req, res, next) => {
        try {
            const result = await logoutService.logoutUser();
            const cookieOptions = {
                secure: config.app.environment === 'production',
                sameSite: 'lax',
                path: '/'
            };

            res.clearCookie(config.auth.jwt.jwtAccessTokenCookieName, cookieOptions);
            res.clearCookie(config.auth.jwt.jwtRefreshTokenCookieName, cookieOptions);

            return res.status(200).json({
                success: result.loggedOut
            });
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createLogoutController;
