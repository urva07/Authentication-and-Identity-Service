const createVerifyEmailController = (verifyEmailService) => ({
    get: async (req, res, next) => {
        try {
            const user = await verifyEmailService.verifyEmail(req.query.token);
            return res.status(201).json({
                success: true,
                message: 'Email verified successfully. You can now log in.',
                user
            });
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createVerifyEmailController;
