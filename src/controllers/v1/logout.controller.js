const config = require('#src/config/config.js');
const {
    AUTH_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_NAME
} = require('#src/constants/auth.js');

const createLogoutController = (logoutService) => ({
    post: async (req, res, next) => {
        try {
            const result = await logoutService.logoutUser();
            const cookieOptions = {
                secure: config.app.environment === 'production',
                sameSite: 'lax',
                path: '/'
            };

            res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
            res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, cookieOptions);

            return res.status(200).json({
                success: result.loggedOut
            });
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createLogoutController;
