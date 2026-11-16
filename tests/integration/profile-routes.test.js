const { afterAll, describe, test, expect, jest: jestApi } = require('@jest/globals');
const express = require('express');
const request = require('supertest');
const config = require('../../src/config/config');

jestApi.mock('../../src/services', () => ({
    'mainApp.services': {
        'profile.services': {
            'profile.service': () => ({
                deleteMyProfile: jestApi.fn().mockResolvedValue({ success: true })
            })
        }
    }
}));

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
    const originalSecret = config.auth.ingress.sharedSecret;
    afterAll(() => { config.auth.ingress.sharedSecret = originalSecret; });

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

    test('DELETE /me requires authorization', async () => {
        await expectAuthenticationRequired(request(app).delete('/me'));
    });

    test('DELETE /me deletes an authenticated profile', async () => {
        config.auth.ingress.sharedSecret = 'test-secret-with-at-least-32-bytes';

        const response = await request(app)
            .delete('/me')
            .set('x-user-id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
            .set('x-ingress-auth-secret', config.auth.ingress.sharedSecret);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ success: true });
    });

    test('GET /:id requires authorization', async () => {
        await expectAuthenticationRequired(request(app).get('/42'));
    });
});
