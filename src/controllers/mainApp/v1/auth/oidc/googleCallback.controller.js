const createGoogleCallbackController = () => {
    return {
        get: async (req, res, next) => {
            try {
                res.status(200).json({
                    success: true,
                    user: req.user
                });
            } catch (error) {
                next(error)
            }
        }
    };
};

module.exports = createGoogleCallbackController;