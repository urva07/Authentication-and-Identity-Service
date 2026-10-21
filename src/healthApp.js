const express = require('express');
const { Registry, collectDefaultMetrics } = require('prom-client');

const createHealthApp = (isStarted) => {
    const app = express();
    const metricsRegistry = new Registry();

    collectDefaultMetrics({ register: metricsRegistry });

    app.get('/startup', (req, res) => {
        if (!isStarted()) {
            return res.status(503).json({
                success: false,
                status: 'starting'
            });
        }

        return res.status(200).json({
            success: true,
            status: 'started'
        });
    });

    app.get('/health', (req, res) =>
        res.status(200).json({
            success: true,
            message: 'Server is healthy'
        })
    );

    const notImplemented = (req, res) => {
        res.status(501).json({
            success: false,
            message: 'Health check not implemented'
        });
    }

    app.get('/health/live', notImplemented);
    app.get('/health/ready', notImplemented);
    app.get('/health/metrics', async (req, res, next) => {
        try {
            const metrics = await metricsRegistry.metrics();
            res.set('Content-Type', metricsRegistry.contentType);
            return res.status(200).send(metrics);
        } catch (error) {
            return next(error);
        }
    });

    return app;
};

module.exports = createHealthApp;
