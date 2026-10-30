const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../../src/config/config');

jest.mock('../../src/services', () => ({
    'login.service': () => ({
        loginUser: jest.fn().mockResolvedValue({
            token: 'test-token',
            user: { id: '1', email: 'ada@example.com' }
        })
    }),
    'verify.service': () => ({
        verifyUser: jest.fn().mockResolvedValue({
            id: '1',
            email: 'ada@example.com'
        })
    }),
    'signin.service': () => ({
        signin: jest.fn().mockResolvedValue({ success: true })
    }),
    'refresh.service': () => ({
        refreshAccessToken: jest.fn().mockReturnValue('new-access-token')
    }),
    'logout.service': () => ({
        logoutUser: jest.fn().mockReturnValue({ loggedOut: true })
    })
}));

const app = require('../../src/app');

describe('Authentication routes', () => {
    const originalJwtSecret = config.auth.jwt.jwtAccessTokenSecret;
    const testJwtSecret = 'test-secret-with-enough-entropy-for-signing';

    beforeAll(() => {
        config.auth.jwt.jwtAccessTokenSecret = testJwtSecret;
    });

    afterAll(() => {
        config.auth.jwt.jwtAccessTokenSecret = originalJwtSecret;
    });

    test.each([
        ['POST', '/v1/auth/forgot-password'],
        ['POST', '/v1/auth/change-password'],
        ['GET', '/v1/auth/csrf'],
        ['GET', '/v1/auth/verify-email/']
    ])('%s %s is registered without controller logic', async (method, path) => {
        const response = await request(app)[method.toLowerCase()](path);

        expect(response.statusCode).toBe(501);
        expect(response.body).toEqual({
            success: false,
            message: 'Endpoint not implemented'
        });
    });

    test('validates POST /v1/auth/signin credentials before its service', async () => {
        const invalidResponse = await request(app)
            .post('/v1/auth/signin')
            .send({});

        expect(invalidResponse.statusCode).toBe(400);
        expect(invalidResponse.body).toMatchObject({
            success: false,
            message: 'Validation failed'
        });

        const validResponse = await request(app)
            .post('/v1/auth/signin')
            .send({
                contactType: 'email',
                email: 'ada@example.com',
                password: 'secret',
                name: 'Ada Lovelace'
            });

        expect(validResponse.statusCode).toBe(202);
        expect(validResponse.body).toEqual({ success: true });
        expect(validResponse.body).not.toHaveProperty('verificationToken');
    });

    test('requires authorization for POST /v1/auth/verify', async () => {
        const response = await request(app).post('/v1/auth/verify');

        expect(response.statusCode).toBe(401);
        expect(response.body).toMatchObject({
            success: false,
            message: 'Authentication failed'
        });
    });

    test('refreshes an authenticated user access token', async () => {
        const token = jwt.sign({ sub: '1' }, testJwtSecret);
        const response = await request(app)
            .post('/v1/auth/refresh')
            .set('Cookie', `auth_token=${token}`)
            .send({ unused: true });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true
        });
        expect(response.body).not.toHaveProperty('data.accessToken');
        expect(response.headers['set-cookie'][0]).toContain(
            'refresh_token=new-access-token'
        );
        expect(response.headers['set-cookie'][0]).not.toContain('HttpOnly');
    });

    test('clears both token cookies on logout without requiring authentication', async () => {
        const response = await request(app).post('/v1/auth/logout');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ success: true });
        expect(response.headers['set-cookie']).toEqual(
            expect.arrayContaining([
                expect.stringContaining('auth_token='),
                expect.stringContaining('refresh_token=')
            ])
        );
    });

    test.each([
        [{ password: 'secret' }],
        [{ email: 'ada@example.com', phone: '+12025550123', password: 'secret' }],
        [{ email: 'not-an-email', password: 'secret' }],
        [{ phone: '   ', password: 'secret' }],
        [{ email: 'ada@example.com', password: '' }],
        [{ email: 'ada@example.com', password: 'secret', unexpected: true }]
    ])('rejects invalid login body %j', async (body) => {
        const response = await request(app).post('/v1/auth/login').send(body);

        expect(response.statusCode).toBe(400);
        expect(response.body).toMatchObject({
            success: false,
            message: 'Validation failed'
        });
        expect(response.body.errors).toEqual(expect.any(Array));
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: expect.any(String),
                    message: expect.any(String)
                })
            ])
        );
    });

    test.each([
        {
            contactType: 'email',
            email: 'ada@example.com',
            password: 'secret'
        },
        {
            contactType: 'phone',
            phone: '+12025550123',
            password: 'secret'
        }
    ])('allows valid login body %j through validation', async (body) => {
        const response = await request(app).post('/v1/auth/login').send(body);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true,
            data: { user: { id: '1', email: 'ada@example.com' } }
        });
        expect(response.headers['set-cookie'][0]).toContain('auth_token=test-token');
        expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    });
});
