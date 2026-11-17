const { jest: jestApi, describe, test, expect } = require('@jest/globals');
const express = require('express');
const request = require('supertest');

jestApi.mock('passport', () => {
    const { jest: mockJest } = require('@jest/globals');

    return {
        authenticate: mockJest.fn((strategy, options) => (req, res, next) => {
            if (!options) {
                return res.redirect('/google-authorization');
            }

            if (req.query.fail === 'true') {
                return res.redirect(options.failureRedirect);
            }

            req.user = { id: '42', email: 'ada@example.com' };
            return next();
        })
    };
});

const passport = require('passport');
const oidcRoutes = require('../../src/routes/mainApp/v1/auth/OIDC');
const app = express();
app.use('/v1/auth/oidc', oidcRoutes);

describe('Google OIDC routes', () => {
    test('starts Google authentication', async () => {
        const response = await request(app).get('/v1/auth/oidc/google');

        expect(passport.authenticate).toHaveBeenCalledWith('google');
        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe('/google-authorization');
    });

    test('returns the authenticated user from the callback', async () => {
        const response = await request(app).get('/v1/auth/oidc/google/callback');

        expect(passport.authenticate).toHaveBeenCalledWith('google', {
            failureRedirect: 'http://localhost:3000/login'
        });
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true,
            user: { id: '42', email: 'ada@example.com' }
        });
    });

    test('redirects failed authentication without invoking the controller', async () => {
        const response = await request(app)
            .get('/v1/auth/oidc/google/callback')
            .query({ fail: 'true' });

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe('http://localhost:3000/login');
    });
});
