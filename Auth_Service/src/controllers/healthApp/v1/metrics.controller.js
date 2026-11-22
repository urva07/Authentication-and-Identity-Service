const createMetricsController = (metricsRegistry) => {
    return {
        getMetrics: async (req, res, next) => {
            try {
                const metrics = await metricsRegistry.metrics();
                res.set('Content-Type', metricsRegistry.contentType);
                return res.status(200).send(metrics);
            } catch (error) {
                return next(error);
            }
        }
    };
};


module.exports = createMetricsController;