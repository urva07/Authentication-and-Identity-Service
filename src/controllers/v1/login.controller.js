const config = require('#src/config/config.js');
const {
    AUTH_COOKIE_NAME,
    TOKEN_EXPIRY_MILLISECONDS
} = require('#src/constants/auth.js');

const notImplemented = (req, res) =>
    res.status(501).json({
        success: false,
        message: 'Endpoint not implemented'
    });

const createLoginController = (loginService) => ({
    get: notImplemented,
    post: async (req, res, next) => {
        try {
            const { token, user } = await loginService.loginUser(req.body);
            res.cookie(AUTH_COOKIE_NAME, token, {
                httpOnly: true,
                secure: config.app.environment === 'production',
                sameSite: 'lax',
                maxAge: TOKEN_EXPIRY_MILLISECONDS,
                path: '/'
            });

            return res.status(200).json({
                success: true,
                data: { user }
            });
        } catch (error) {
            return next(error);
        }
    },
    put: notImplemented,
    patch: notImplemented,
    delete: notImplemented
});

module.exports = createLoginController;
