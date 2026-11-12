const express = require('express');
const metricsRegistry = require('#src/monitoring/prometheus.js');
const { "notImplemented.middleware": notImplemented } = require('#src/middlewares/index.js');


const router = express.Router();

router.get('/startup', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Startup check passed'
    });
});

router.get('/live', notImplemented);

router.get('/ready', notImplemented);

router.get('/metrics', async (req, res, next) => {
    try {
        const metrics = await metricsRegistry.metrics();
        res.set('Content-Type', metricsRegistry.contentType);
        return res.status(200).send(metrics);
    } catch (error) {
        return next(error);
    }
});

router.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});


module.exports = router;
