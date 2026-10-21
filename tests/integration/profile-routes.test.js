const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../../src/config/config');
const app = require('../../src/app');

describe('Profile routes', () => {
    const originalJwtSecret = config.auth.jwtSecret;
    const testJwtSecret = 'test-secret-with-enough-entropy-for-signing';

    beforeAll(() => {
        config.auth.jwtSecret = testJwtSecret;
    });

    afterAll(() => {
        config.auth.jwtSecret = originalJwtSecret;
    });

    test.each([
        ['get', '/api/v1/profile/me'],
        ['patch', '/api/v1/profile/me'],
        ['get', '/api/v1/profile/42']
    ])('%s %s requires authorization', async (method, path) => {
            const response = await request(app)[method](path);

            expect(response.statusCode).toBe(401);
            expect(response.body).toMatchObject({
                success: false,
                message: 'Authentication failed'
            });
        });

    test.each([
        ['get', '/api/v1/profile/me'],
        ['patch', '/api/v1/profile/me'],
        ['get', '/api/v1/profile/42']
    ])('%s %s is registered without business logic', async (method, path) => {
            const token = jwt.sign({ sub: '42' }, testJwtSecret);
            const response = await request(app)[method](path)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(501);
            expect(response.body).toEqual({
                success: false,
                message: 'Endpoint not implemented'
            });
        });
});
