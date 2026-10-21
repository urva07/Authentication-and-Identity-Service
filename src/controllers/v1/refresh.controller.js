const config = require('#src/config/config.js');
const {
    REFRESH_TOKEN_COOKIE_NAME,
    TOKEN_EXPIRY_MILLISECONDS
} = require('#src/constants/auth.js');

const createRefreshController = (refreshService) => ({
    post: async (req, res, next) => {
        try {
            const accessToken = await refreshService.refreshAccessToken(
                req.user
            );
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, accessToken, {
                httpOnly: false,
                secure: config.app.environment === 'production',
                sameSite: 'lax',
                maxAge: TOKEN_EXPIRY_MILLISECONDS,
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
