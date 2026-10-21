const createSigninController = (signinService) => ({
    post: async (req, res, next) => {
        try {
            await signinService.signin(req.body);
            return res.status(200).json({ success: true });
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createSigninController;
