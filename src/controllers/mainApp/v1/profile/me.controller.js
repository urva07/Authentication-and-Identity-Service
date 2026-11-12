const createMeController = (profileService) => ({
    get: async (req, res, next) => {
        try {
            const profile = await profileService.getMyProfile(req.user, req.log);

            return res.status(200).json({
                success: true,
                data: { profile }
            });
        } catch (error) {
            return next(error);
        }
    },
    patch: async (req, res, next) => {
        try {
            const profile = await profileService.updateMyProfile(
                req.user,
                req.body,
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

module.exports = createMeController;
