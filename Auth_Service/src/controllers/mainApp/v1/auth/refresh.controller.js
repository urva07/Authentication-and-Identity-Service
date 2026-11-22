const config = require('#src/config/config/index.js');

const createRefreshController = (refreshService) => ({
    post: async (req, res, next) => {
        try {
            const accessToken = await refreshService.refreshAccessToken(
                req.user,
                req.log
            );
            res.cookie(config.auth.jwt.cookieOptions.access.name, accessToken, {
                httpOnly: config.auth.jwt.cookieOptions.access.httpOnly,
                secure: config.auth.jwt.cookieOptions.access.secure,
                sameSite: config.auth.jwt.cookieOptions.access.sameSite,
                maxAge: config.auth.jwt.cookieOptions.access.maxAge,
                path: config.auth.jwt.cookieOptions.access.path
            });

            return res.status(200).json({
                success: true
            });
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createRefreshController;
