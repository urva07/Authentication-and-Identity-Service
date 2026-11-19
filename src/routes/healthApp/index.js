const express = require('express');
const metricsRegistry = require('#src/monitoring/prometheus.js');
const { dbs: { mysql: { sequelize } } } = require('#src/infrastructure/database/index.js');
const { 
    "healthApp.versions": { 
        v1: { 
            "metrics.controller": createMetricsController,
            "probes.controller": {
                createLivenessController,
                createReadinessController
            }
        } 
    } 
} = require('#src/controllers/index.js');


const router = express.Router();

router.get('/startup', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Startup check passed'
    });
});

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


module.exports = router;