const createSigninController = (signinService) => ({
    post: async (req, res, next) => {
        try {
            const result = await signinService.signin(req.body);
            return res.status(202).json(result);
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createSigninController;
