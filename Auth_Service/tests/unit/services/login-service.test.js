const { describe, beforeEach, jest: jestApi, afterAll, test, expect } = require('@jest/globals');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const mockCacheAuthenticatedUser = jestApi.fn().mockResolvedValue(undefined);

jestApi.mock('#src/lib/index.js', () => {
    const actual = jestApi.requireActual('#src/lib/index.js');
    return {
        ...actual,
        cacheAuthenticatedUser: (...args) => mockCacheAuthenticatedUser(...args)
    };
});

const createLoginService = require('../../../src/services/mainApp/auth/login.service');
const config = require('../../../src/config/config');
const { AuthenticationError } = require('../../../src/errors');

describe('login service', () => {
    const userId = '3f0c1d52-8a7e-4b1c-9d34-5e6f7a8b9c0d';
    const jwtSecret = 'test-secret-with-enough-entropy-for-signing';
    const originalSecrets = {
        access: config.auth.jwt.jwtAccessTokenSecret,
        refresh: config.auth.jwt.jwtRefreshTokenSecret
    };
    let userRepository;
    let userPasswordRepository;
    let userExistenceRepository;
    let userLockRepository;
    let passwordHash;
    let loginService;

    beforeEach(async () => {
        jestApi.clearAllMocks();
        config.auth.jwt.jwtAccessTokenSecret = jwtSecret;
        config.auth.jwt.jwtRefreshTokenSecret = jwtSecret;
        passwordHash = await bcrypt.hash('correct password', 4);
        userRepository = {
            findByEmail: jestApi.fn()
        };
        userPasswordRepository = {
            findByUserId: jestApi.fn().mockResolvedValue({ passwordHash })
        };
        userExistenceRepository = {
            setById: jestApi.fn().mockResolvedValue(undefined)
        };
        userLockRepository = {
            acquire: jestApi.fn().mockResolvedValue(true),
            release: jestApi.fn().mockResolvedValue(1)
        };
        loginService = createLoginService({
            userRepository,
            userPasswordRepository,
            userExistenceRepository,
            userLockRepository,
            jwtSecret
        });
    });

    afterAll(() => {
        config.auth.jwt.jwtAccessTokenSecret = originalSecrets.access;
        config.auth.jwt.jwtRefreshTokenSecret = originalSecrets.refresh;
    });

    test('authenticates with email, verifies bcrypt, and returns a signed token and safe user fields', async () => {
        const requestLogger = { debug: jestApi.fn() };
        userRepository.findByEmail.mockResolvedValue({
            id: userId,
            email: 'ada@example.com',
            phone: null,
            firstName: 'Ada',
            lastName: 'Lovelace',
            profilePhoto: null,
            profileCompleted: true,
            passwordHash: 'must not be returned'
        });

        const result = await loginService.loginUser({
            email: 'ADA@example.com',
            password: 'correct password'
        }, requestLogger);

        expect(requestLogger.debug).toHaveBeenCalled();
        expect(userRepository.findByEmail).toHaveBeenCalledWith(
            'ada@example.com'
        );
        expect(userPasswordRepository.findByUserId).toHaveBeenCalledWith(userId);
        expect(jwt.verify(result.accessToken, jwtSecret)).toMatchObject({ sub: userId });
        expect(jwt.verify(result.refreshToken, jwtSecret)).toMatchObject({ sub: userId });
        expect(mockCacheAuthenticatedUser).toHaveBeenCalledWith(
            { userExistenceRepository, userLockRepository },
            userId,
            expect.anything()
        );
        expect(result.user).toEqual({
            id: userId,
            email: 'ada@example.com',
            phone: null,
            firstName: 'Ada',
            lastName: 'Lovelace',
            profilePhoto: null,
            profileCompleted: true
        });
    });

    test('rejects login credentials without an email address', async () => {
        await expect(loginService.loginUser({
            phone: '+12025550123',
            password: 'correct password'
        })).rejects.toBeInstanceOf(AuthenticationError);

        expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    test('coalesces overlapping reads for the same login credentials', async () => {
        userRepository.findByEmail.mockResolvedValue({
            id: userId,
            email: 'ada@example.com'
        });
        const logger = { debug: jestApi.fn() };

        await Promise.all([
            loginService.loginUser({
                email: 'ADA@example.com',
                password: 'correct password'
            }, logger),
            loginService.loginUser({
                email: 'ada@example.com',
                password: 'correct password'
            }, logger)
        ]);

        expect(userRepository.findByEmail).toHaveBeenCalledTimes(1);
        expect(userPasswordRepository.findByUserId).toHaveBeenCalledTimes(1);
    });

    test('rejects unknown users', async () => {
        userRepository.findByEmail.mockResolvedValue(null);

        await expect(
            loginService.loginUser({
                email: 'ada@example.com',
                password: 'correct password'
            })
        ).rejects.toMatchObject({
            name: 'AuthenticationError',
            statusCode: 401,
            message: 'Invalid login credentials'
        });
    });

    test('rejects users without a password credential', async () => {
        userRepository.findByEmail.mockResolvedValue({ id: userId });
        userPasswordRepository.findByUserId.mockResolvedValue(null);

        await expect(
            loginService.loginUser({
                email: 'ada@example.com',
                password: 'correct password'
            })
        ).rejects.toBeInstanceOf(AuthenticationError);
    });

    test('rejects incorrect passwords', async () => {
        userRepository.findByEmail.mockResolvedValue({ id: userId });

        await expect(
            loginService.loginUser({
                email: 'ada@example.com',
                password: 'incorrect password'
            })
        ).rejects.toBeInstanceOf(AuthenticationError);
    });

    test('rejects weak or missing JWT signing secrets', async () => {
        config.auth.jwt.jwtAccessTokenSecret = '';
        userRepository.findByEmail.mockResolvedValue({ id: userId });
        const service = createLoginService({
            userRepository,
            userPasswordRepository
        });

        await expect(
            service.loginUser({
                email: 'ada@example.com',
                password: 'correct password'
            })
        ).rejects.toMatchObject({
            message: 'Failed to generate JWT token'
        });
    });
});
