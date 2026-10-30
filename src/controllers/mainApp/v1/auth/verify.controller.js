const createVerifyController = (verifyService) => ({
    post: async (req, res, next) => {
        try {
            const user = await verifyService.verifyUser(req.user);
            return res.status(200).json({
                success: true,
                user
            });
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createVerifyController;
