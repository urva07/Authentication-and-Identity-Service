const express = require('express');
const { registry: metricsRegistry } = require('../monitoring/metrics');

const router = express.Router();

const notImplemented = (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Health check not implemented'
    });
};

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

module.exports = router;
