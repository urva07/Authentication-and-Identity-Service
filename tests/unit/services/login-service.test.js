const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createLoginService = require('../../../src/services/login.service');
const { auth } = require('../../../src/config/config');
const { AuthenticationError } = require('../../../src/errors');

describe('login service', () => {
    const jwtSecret = auth.jwtSecret;
    let userRepository;
    let userPasswordRepository;
    let passwordHash;
    let loginService;

    beforeEach(async () => {
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

    test('authenticates with email, verifies bcrypt, and returns a signed token and safe user fields', async () => {
        userRepository.findByEmail.mockResolvedValue({
            id: 7,
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
        expect(userPasswordRepository.findByUserId).toHaveBeenCalledWith(7);
        expect(jwt.verify(result.token, jwtSecret)).toMatchObject({ sub: '7' });
        expect(result.user).toEqual({
            id: '7',
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
            id: 8,
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
        userRepository.findByEmail.mockResolvedValue({ id: 7 });
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
        userRepository.findByEmail.mockResolvedValue({ id: 7 });

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
            statusCode: 500,
            message: 'Authentication requires a JWT secret of at least 32 bytes'
        });
    });
});
