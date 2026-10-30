const createGoogleCallbackController = (googleCallbackService) => {
    return {
        get: async (req, res, next) => {
            try {
                const result = await googleCallbackService(req);
                res.status(200).json({
                    success: true,
                    data: result
                });
            } catch (error) {
                next(error)
            }
        }
    };
};

module.exports = createGoogleCallbackController;