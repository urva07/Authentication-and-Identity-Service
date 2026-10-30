const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createLoginService = require('../../../src/services/login.service');
const config = require('../../../src/config/config');
const { AuthenticationError } = require('../../../src/errors');

describe('login service', () => {
    const userId = '3f0c1d52-8a7e-4b1c-9d34-5e6f7a8b9c0d';
    const jwtSecret = 'test-secret-with-enough-entropy-for-signing';
    const originalRefreshSecret = config.auth.jwt.jwtRefreshTokenSecret;
    let userRepository;
    let userPasswordRepository;
    let passwordHash;
    let loginService;

    beforeEach(async () => {
        config.auth.jwt.jwtRefreshTokenSecret = jwtSecret;
        passwordHash = await bcrypt.hash('correct password', 4);
        userRepository = {
            findByEmail: jest.fn(),
            findByPhone: jest.fn()
        };
        userPasswordRepository = {
            findByUserId: jest.fn().mockResolvedValue({ passwordHash })
        };
        loginService = createLoginService({
            userRepository,
            userPasswordRepository,
            jwtSecret
        });
    });

    afterAll(() => {
        config.auth.jwt.jwtRefreshTokenSecret = originalRefreshSecret;
    });

    test('authenticates with email, verifies bcrypt, and returns a signed token and safe user fields', async () => {
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
            contactType: 'email',
            email: 'ADA@example.com',
            password: 'correct password'
        });

        expect(userRepository.findByEmail).toHaveBeenCalledWith(
            'ada@example.com'
        );
        expect(userPasswordRepository.findByUserId).toHaveBeenCalledWith(userId);
        expect(jwt.verify(result.token, jwtSecret)).toMatchObject({ sub: userId });
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

    test('authenticates with phone', async () => {
        userRepository.findByPhone.mockResolvedValue({
            id: userId,
            phone: '+12025550123'
        });

        await loginService.loginUser({
            contactType: 'phone',
            phone: '+12025550123',
            password: 'correct password'
        });

        expect(userRepository.findByPhone).toHaveBeenCalledWith(
            '+12025550123'
        );
    });

    test('rejects unknown users', async () => {
        userRepository.findByEmail.mockResolvedValue(null);

        await expect(
            loginService.loginUser({
                contactType: 'email',
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
                contactType: 'email',
                email: 'ada@example.com',
                password: 'correct password'
            })
        ).rejects.toBeInstanceOf(AuthenticationError);
    });

    test('rejects incorrect passwords', async () => {
        userRepository.findByEmail.mockResolvedValue({ id: userId });

        await expect(
            loginService.loginUser({
                contactType: 'email',
                email: 'ada@example.com',
                password: 'incorrect password'
            })
        ).rejects.toBeInstanceOf(AuthenticationError);
    });

    test('rejects weak or missing JWT signing secrets', async () => {
        const service = createLoginService({
            userRepository,
            userPasswordRepository,
            jwtSecret: ''
        });

        await expect(
            service.loginUser({
                contactType: 'email',
                email: 'ada@example.com',
                password: 'correct password'
            })
        ).rejects.toMatchObject({
            message: 'Authentication requires a JWT secret of at least 32 bytes'
        });
    });
});
