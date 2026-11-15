const config = require('#src/config/config/index.js');

const createLogoutController = (logoutService) => ({
    post: async (req, res, next) => {
        try {
            const result = await logoutService.logoutUser(req.log);
            const refreshCookieOptions = {
                secure: config.auth.jwt.cookieOptions.refresh.secure,
                sameSite: config.auth.jwt.cookieOptions.refresh.sameSite,
                path: config.auth.jwt.cookieOptions.refresh.path,
            };

            const accessCookieOptions = {
                secure: config.auth.jwt.cookieOptions.access.secure,
                sameSite: config.auth.jwt.cookieOptions.access.sameSite,
                path: config.auth.jwt.cookieOptions.access.path,
            };

            res.clearCookie(config.auth.jwt.cookieOptions.access.name, accessCookieOptions);
            res.clearCookie(config.auth.jwt.cookieOptions.refresh.name, refreshCookieOptions);

            return res.status(200).json({
                success: result.loggedOut
            });
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createLogoutController;
