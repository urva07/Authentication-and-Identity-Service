const config = require('#src/config/config/index.js');
const { AuthenticationError } = require('#src/errors/index.js');


const createGoogleCallbackController = (googleCallbackService) => {
    if (!googleCallbackService) {
        throw new Error('Google Callback Service is required');
    }

    return {
        get: async (req, res, next) => {
            try {
                const { accessToken, refreshToken, user } = await googleCallbackService.loginUser(req.user, req.log);

                if (!user) {
                    req.log?.warn('No user returned from Google Callback Service. Please check the service implementation.');
                    throw new AuthenticationError();
                }

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
                    user
                });

                req.log?.debug('Google OIDC login completed', { userId: String(user.id) });

                return;
            } catch (error) {
                return next(error);
            }
        }
    };
};

module.exports = createGoogleCallbackController;