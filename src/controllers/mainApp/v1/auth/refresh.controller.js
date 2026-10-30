const config = require('#src/config/config.js');

const createRefreshController = (refreshService) => ({
    post: async (req, res, next) => {
        try {
            const accessToken = await refreshService.refreshAccessToken(
                req.user
            );
            res.cookie(config.auth.jwt.jwtAccessTokenCookieName, accessToken, {
                httpOnly: false,
                secure: config.app.environment === 'production',
                sameSite: 'lax',
                maxAge: config.auth.jwt.jwtAccessTokenCookieExpirationMili,
                path: '/'
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
