const { describe, test, expect } = require('@jest/globals');
const express = require('express');
const request = require('supertest');
const profileRoutes = require('../../src/routes/mainApp/v1/profile');

const app = express();
app.use('/', profileRoutes);
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
    });
});

describe('Profile routes', () => {
    const expectAuthenticationRequired = async (responsePromise) => {
        const response = await responsePromise;
        expect(response.statusCode).toBe(401);
        expect(response.body).toMatchObject({
            success: false,
            message: 'Authentication failed'
        });
    };

    test('GET /me requires authorization', async () => {
        await expectAuthenticationRequired(request(app).get('/me'));
    });

    test('PATCH /me requires authorization', async () => {
        await expectAuthenticationRequired(request(app).patch('/me'));
    });

    test('GET /:id requires authorization', async () => {
        await expectAuthenticationRequired(request(app).get('/42'));
    });
});
