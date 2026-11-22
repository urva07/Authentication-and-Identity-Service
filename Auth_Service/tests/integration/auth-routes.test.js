const { jest: jestApi, describe, test, expect } = require('@jest/globals');
const request = require('supertest');
const config = require('../../src/config/config');

jestApi.mock('../../src/services', () => ({
    'mainApp.services': {
        'profile.services': {
            'profile.service': () => ({})
        },
        'auth.services': {
            'passport-login.service': () => ({
                loginUser: jestApi.fn().mockResolvedValue({
                    accessToken: 'test-access-token',
                    refreshToken: 'test-refresh-token',
                    user: { id: '1', email: 'ada@example.com' }
                })
            }),
            'oidc.services': {
                'google-callback.service': () => ({
                    loginUser: jestApi.fn().mockResolvedValue({
                        accessToken: 'test-access-token',
                        refreshToken: 'test-refresh-token',
                        user: { id: '1', email: 'ada@example.com' }
                    })
                })
            },
            'verify.service': () => ({
                verifyUser: jestApi.fn().mockResolvedValue({
                    id: '1',
                    email: 'ada@example.com'
                })
            }),
            'signin.service': () => ({
                signin: jestApi.fn().mockResolvedValue({
                    success: true,
                    message: 'Verification email sent'
                })
            }),
            'verify-email.service': () => ({
                verifyEmail: jestApi.fn().mockResolvedValue({
                    conflict: false,
                    accessToken: 'test-access-token',
                    refreshToken: 'test-refresh-token',
                    response: { success: true, user: { id: '1', email: 'ada@example.com' } }
                })
            }),
            'refresh.service': () => ({
                refreshAccessToken: jestApi.fn().mockReturnValue('new-access-token')
            }),
            'logout.service': () => ({
                logoutUser: jestApi.fn().mockReturnValue({ loggedOut: true })
            }),
            'forgot-password.service': () => ({
                forgotPassword: jestApi.fn().mockResolvedValue({
                    success: true,
                    message: 'If an account exists, a reset link has been sent.'
                })
            }),
            'change-password.service': () => ({
                changePassword: jestApi.fn().mockResolvedValue({
                    success: true,
                    message: 'Password has been changed successfully.'
                })
            })
        }
    }
}));

jestApi.mock('../../src/repositories', () => ({
    ...jestApi.requireActual('../../src/repositories'),
    mysql: {
        ...jestApi.requireActual('../../src/repositories').mysql,
        getUserRepository: () => ({
            findByEmailWithPassword: jestApi.fn().mockResolvedValue({
                id: '1',
                email: 'ada@example.com',
                password: { passwordHash: 'hash' }
            })
        })
    }
}));

jestApi.mock('../../src/utils/hashPasswordAndVerify.js', () => ({
    ...jestApi.requireActual('../../src/utils/hashPasswordAndVerify.js'),
    verifyPassword: jestApi.fn().mockResolvedValue(true)
}));

const app = require('../../src/app');

describe('Authentication routes', () => {
    test('validates and processes a password reset', async () => {
        const response = await request(app)
            .post('/v1/auth/change-password')
            .send({ token: 'signed-reset-token', newPassword: 'new-password' });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Password has been changed successfully.'
        });
    });

    test('rejects invalid change-password input before the service', async () => {
        const response = await request(app)
            .post('/v1/auth/change-password')
            .send({ token: 'signed-reset-token' });

        expect(response.statusCode).toBe(400);
        expect(response.body).toMatchObject({
            success: false,
            message: 'Validation failed'
        });
    });

    test('GET /v1/auth/csrf is registered without controller logic', async () => {
        const method = 'get';
        const path = '/v1/auth/csrf';
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
                email: 'ada@example.com',
                password: 'secret',
                name: 'Ada Lovelace'
            });

        expect(validResponse.statusCode).toBe(200);
        expect(validResponse.body).toEqual({
            success: true,
            message: 'Verification email sent'
        });
    });

    test('validates and processes a password reset request', async () => {
        const response = await request(app)
            .post('/v1/auth/forgot-password')
            .send({ email: 'ada@example.com' });

        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject({ success: true });
    });

    test('requires a refresh-token cookie for POST /v1/auth/refresh', async () => {
        const response = await request(app).post('/v1/auth/refresh');

        expect(response.statusCode).toBe(401);
    });

    test('clears both token cookies on logout without requiring authentication', async () => {
        const response = await request(app).post('/v1/auth/logout');
        const setCookies = response.headers['set-cookie'];

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ success: true });
        expect(setCookies).toEqual(
            expect.arrayContaining([
                expect.stringContaining(`${config.auth.jwt.cookieOptions.access.name}=`),
                expect.stringContaining(`${config.auth.jwt.cookieOptions.refresh.name}=`)
            ])
        );
    });

    test('verifies an email when a token is provided', async () => {
        const response = await request(app)
            .get('/v1/auth/verify-email')
            .query({ token: 'valid-token' });

        expect(response.statusCode).toBe(201);
        expect(response.body).toMatchObject({
            success: true,
            user: { id: '1', email: 'ada@example.com' }
        });
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
            email: 'ada@example.com',
            password: 'secret'
        }
    ])('allows valid login body %j through validation', async (body) => {
        const response = await request(app).post('/v1/auth/login').send(body);
        const setCookies = response.headers['set-cookie'];

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true,
            data: { user: { id: '1', email: 'ada@example.com' } }
        });
        expect(setCookies).toEqual(
            expect.arrayContaining([
                expect.stringContaining(`${config.auth.jwt.cookieOptions.access.name}=test-access-token`),
                expect.stringContaining(`${config.auth.jwt.cookieOptions.refresh.name}=test-refresh-token`)
            ])
        );
    });
});
