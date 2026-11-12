const createSigninController = (signinService) => ({
    post: async (req, res, next) => {
        try {
            const result = await signinService.signin(
                req.body,
                req.abortSignal,
                req.log
            );
            return res.status(200).json(result);
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createSigninController;
