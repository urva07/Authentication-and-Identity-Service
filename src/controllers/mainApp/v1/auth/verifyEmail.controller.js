const config = require('#src/config/config.js');


const createVerifyEmailController = (verifyEmailService) => ({
    get: async (req, res, next) => {
        try {
            const output = await verifyEmailService.verifyEmail(
                req.query.token,
                req.log
            );
            
            if (!output.conflict) {
                res.cookie(config.auth.jwt.cookieOptions.refresh.name, output.refreshToken, {
                    httpOnly: config.auth.jwt.cookieOptions.refresh.httpOnly,
                    secure: config.auth.jwt.cookieOptions.refresh.secure,
                    sameSite: config.auth.jwt.cookieOptions.refresh.sameSite,
                    maxAge: config.auth.jwt.cookieOptions.refresh.maxAge,
                    path: config.auth.jwt.cookieOptions.refresh.path,
                });

                res.cookie(config.auth.jwt.cookieOptions.access.name, output.accessToken, {
                    httpOnly: config.auth.jwt.cookieOptions.access.httpOnly,
                    secure: config.auth.jwt.cookieOptions.access.secure,
                    sameSite: config.auth.jwt.cookieOptions.access.sameSite,
                    maxAge: config.auth.jwt.cookieOptions.access.maxAge,
                    path: config.auth.jwt.cookieOptions.access.path,
                });
            }

            return res.status(output.conflict ? 200 : 201).json(output.response);
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createVerifyEmailController;
