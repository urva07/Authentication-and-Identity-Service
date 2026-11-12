const { describe, test, beforeEach, afterAll, expect, jest: jestApi } = require('@jest/globals');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../../src/config/config');
const repositories = require('../../src/repositories');
const profileRoutes = require('../../src/routes/mainApp/v1/profile');
const errorMiddleware = require('../../src/middlewares/error.middleware');

const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const otherId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const secret = 'test-ingress-secret-at-least-32-bytes';
const jwtSecret = 'test-access-token-secret-at-least-32-bytes';
const originalIngressSecret = config.auth.ingress.sharedSecret;
const originalJwtSecret = config.auth.jwt.jwtAccessTokenSecret;

const app = express();
app.use(express.json());
app.use('/profile', profileRoutes);
app.use(errorMiddleware);

let users;
let findByPk;
let update;

describe('profile identity', () => {
    beforeEach(() => {
        config.auth.ingress.sharedSecret = secret;
        config.auth.jwt.jwtAccessTokenSecret = jwtSecret;
        users = new Map([
            [userId, { id: userId, email: 'ada@example.com', firstName: 'Ada', phone: '123456789' }],
            [otherId, { id: otherId, email: 'other@example.com', firstName: 'Other' }]
        ]);
        findByPk = jestApi.fn(async (id) => users.get(id) || null);
        update = jestApi.fn(async (attributes, options) => {
            const user = users.get(options.where.id);
            if (!user) return [0];
            Object.assign(user, attributes);
            return [1];
        });
        repositories.mysql.configureRepositories({
            User: { findByPk, update },
            UserPassword: {},
            IdentityProvider: {},
            ActiveToken: {}
        });
    });

    afterAll(() => {
        config.auth.ingress.sharedSecret = originalIngressSecret;
        config.auth.jwt.jwtAccessTokenSecret = originalJwtSecret;
    });

    test('GET /me loads private profile using the authenticated ingress ID', async () => {
        const response = await request(app).get('/profile/me')
            .set('x-user-id', userId)
            .set('x-ingress-auth-secret', secret);

        expect(response.status).toBe(200);
        expect(response.body.data.profile).toMatchObject(users.get(userId));
        expect(findByPk).toHaveBeenCalledWith(userId, expect.any(Object));
    });

    test('PATCH /me updates only the authenticated ingress ID', async () => {
        const response = await request(app).patch('/profile/me')
            .set('x-user-id', userId)
            .set('x-ingress-auth-secret', secret)
            .send({ firstName: 'Augusta' });

        expect(response.status).toBe(200);
        expect(response.body.data.profile.firstName).toBe('Augusta');
        expect(update).toHaveBeenCalledWith(
            { firstName: 'Augusta' },
            expect.objectContaining({ where: { id: userId } })
        );
    });

    test.each([
        ['missing secret', { 'x-user-id': otherId }],
        ['wrong secret', { 'x-user-id': otherId, 'x-ingress-auth-secret': 'incorrect' }],
        ['missing ID', { 'x-ingress-auth-secret': secret }],
        ['invalid ID', { 'x-user-id': 'invalid', 'x-ingress-auth-secret': secret }]
    ])('rejects %s without a lookup', async (description, headers) => {
        const response = await request(app).get('/profile/me').set(headers);
        expect(response.status).toBe(401);
        expect(findByPk).not.toHaveBeenCalled();
    });

    test('does not fall back to a bearer token when a spoofed identity header is present', async () => {
        const token = jwt.sign({ sub: userId }, jwtSecret);
        const response = await request(app).get('/profile/me')
            .set('authorization', `Bearer ${token}`)
            .set('x-user-id', otherId);
        expect(response.status).toBe(401);
        expect(findByPk).not.toHaveBeenCalled();
    });

    test('fails closed when the ingress secret is not configured', async () => {
        config.auth.ingress.sharedSecret = undefined;
        const response = await request(app).get('/profile/me')
            .set('x-user-id', userId)
            .set('x-ingress-auth-secret', secret);
        expect(response.status).toBe(500);
        expect(findByPk).not.toHaveBeenCalled();
    });

    test('returns 404 for an unknown ingress user', async () => {
        const response = await request(app).get('/profile/me')
            .set('x-user-id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13')
            .set('x-ingress-auth-secret', secret);
        expect(response.status).toBe(404);
    });

    test('validates updates before writing for an ingress user', async () => {
        const response = await request(app).patch('/profile/me')
            .set('x-user-id', userId)
            .set('x-ingress-auth-secret', secret)
            .send({ email: 'attacker@example.com' });
        expect(response.status).toBe(400);
        expect(update).not.toHaveBeenCalled();
    });

    test('returns 404 when updating an unknown ingress user', async () => {
        const response = await request(app).patch('/profile/me')
            .set('x-user-id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13')
            .set('x-ingress-auth-secret', secret)
            .send({ firstName: 'Ada' });
        expect(response.status).toBe(404);
    });

    test('rejects bearer authentication without ingress headers for reads', async () => {
        const token = jwt.sign({ sub: userId }, jwtSecret);
        const response = await request(app).get('/profile/me')
            .set('authorization', `Bearer ${token}`);
        expect(response.status).toBe(401);
        expect(findByPk).not.toHaveBeenCalled();
    });

    test('rejects bearer authentication without ingress headers for updates', async () => {
        const token = jwt.sign({ sub: userId }, jwtSecret);
        const response = await request(app).patch('/profile/me')
            .set('authorization', `Bearer ${token}`)
            .send({ firstName: 'Augusta' });
        expect(response.status).toBe(401);
        expect(findByPk).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });

    test('returns only public fields for another profile using ingress identity', async () => {
        const response = await request(app).get(`/profile/${otherId}`)
            .set('x-user-id', userId)
            .set('x-ingress-auth-secret', secret);
        expect(response.status).toBe(200);
        expect(response.body.data.profile).toEqual({
            id: otherId,
            firstName: 'Other',
            lastName: null,
            profilePhoto: null
        });
        expect(findByPk).toHaveBeenCalledWith(otherId, expect.any(Object));
    });

    test('returns the complete profile when requesting the ingress user ID', async () => {
        const response = await request(app).get(`/profile/${userId}`)
            .set('x-user-id', userId)
            .set('x-ingress-auth-secret', secret);
        expect(response.status).toBe(200);
        expect(response.body.data.profile).toMatchObject(users.get(userId));
        expect(findByPk).toHaveBeenCalledWith(userId, expect.any(Object));
    });

    test.each([
        ['missing headers', {}],
        ['missing secret', { 'x-user-id': userId }],
        ['invalid secret', { 'x-user-id': userId, 'x-ingress-auth-secret': 'incorrect' }],
        ['invalid identity', { 'x-user-id': 'invalid', 'x-ingress-auth-secret': secret }]
    ])('rejects %s for /:id without a lookup', async (description, headers) => {
        const response = await request(app).get(`/profile/${otherId}`).set(headers);
        expect(response.status).toBe(401);
        expect(findByPk).not.toHaveBeenCalled();
    });

    test('rejects bearer token alone for /:id', async () => {
        const token = jwt.sign({ sub: userId }, jwtSecret);
        const response = await request(app).get(`/profile/${otherId}`)
            .set('authorization', `Bearer ${token}`);
        expect(response.status).toBe(401);
        expect(findByPk).not.toHaveBeenCalled();
    });

    test('returns 400 for invalid profile ID without a lookup', async () => {
        const response = await request(app).get('/profile/invalid')
            .set('x-user-id', userId)
            .set('x-ingress-auth-secret', secret);
        expect(response.status).toBe(400);
        expect(findByPk).not.toHaveBeenCalled();
    });

    test('returns 404 for an unknown profile ID', async () => {
        const response = await request(app).get('/profile/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13')
            .set('x-user-id', userId)
            .set('x-ingress-auth-secret', secret);
        expect(response.status).toBe(404);
    });
});
