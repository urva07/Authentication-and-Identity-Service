const createStartupController = () => ({
    getStartup: (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Startup check passed'
        });
    }
});

const createLivenessController = () => ({
    getLiveness: (req, res) => {
        if (req.app.locals.shuttingDown) {
            return res.status(503).json({
                success: false,
                message: 'Liveness check failed'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Liveness check passed'
        });
    }
});

const createReadinessController = (sequelize) => ({
    getReadiness: async (req, res) => {
        if (
            req.app.locals.shuttingDown
            || req.app.locals.startupComplete !== true
        ) {
            return res.status(503).json({
                success: false,
                message: 'Readiness check failed'
            });
        }

        try {
            await sequelize.query('SELECT 1');

            return res.status(200).json({
                success: true,
                message: 'Readiness check passed'
            });
        } catch {
            return res.status(503).json({
                success: false,
                message: 'Readiness check failed'
            });
        }
    }
});


module.exports = {
    createStartupController,
    createLivenessController,
    createReadinessController
};
