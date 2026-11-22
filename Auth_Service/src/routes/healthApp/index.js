const express = require('express');
const metricsRegistry = require('#src/monitoring/prometheus.js');
const { dbs: { mysql: { sequelize } } } = require('#src/infrastructure/database/index.js');
const { 
    "healthApp.versions": { 
        v1: { 
            "metrics.controller": createMetricsController,
            "probes.controller": {
                createStartupController,
                createLivenessController,
                createReadinessController
            }
        } 
    } 
} = require('#src/controllers/index.js');
const logger = require('#src/utils/logger.js');


const router = express.Router();

router.get('/startup', createStartupController().getStartup);

router.get(
    '/live',
    createLivenessController().getLiveness
);

router.get(
    '/ready',
    createReadinessController(sequelize).getReadiness
);

router.get('/metrics', createMetricsController(metricsRegistry).getMetrics);

router.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

router.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});


module.exports = router;