const createProfileByIdController = (profileService) => ({
    get: async (req, res, next) => {
        try {
            const profile = await profileService.getProfileById(
                req.user,
                req.params.id,
                req.log
            );

            return res.status(200).json({
                success: true,
                data: { profile }
            });
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createProfileByIdController;
