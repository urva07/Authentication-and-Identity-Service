const { describe, beforeEach, jest: jestApi, afterAll, test, expect } = require('@jest/globals');
const config = require('../../../src/config/config');
const { generateAes256GcmToken } = require('../../../src/utils/aes256GcmToken');
const { createSigninTokenKey } = require('../../../src/utils/signinTokenKey');

const mockCacheAuthenticatedUser = jestApi.fn().mockResolvedValue(undefined);

jestApi.mock('#src/lib/index.js', () => {
    const actual = jestApi.requireActual('#src/lib/index.js');
    return {
        ...actual,
        cacheAuthenticatedUser: (...args) => mockCacheAuthenticatedUser(...args)
    };
});

const createVerifyEmailService = require('../../../src/services/mainApp/auth/verifyEmail.service');

describe('verify email service', () => {
    const tokenSecret = 'b7f2c9a4e1d6380f5a0e9d3c7b1f6428c4e8a2f6d0b9137e1f5c8b3a6d2e9047';
    const originalSecret = config.auth.basic.signinAes256GcmTokenSecret;
    const userId = '3f0c1d52-8a7e-4b1c-9d34-5e6f7a8b9c0d';
    const transaction = { id: 'transaction' };
    let userRepository;
    let userPasswordRepository;
    let userExistenceRepository;
    let userLockRepository;
    let sequelize;
    let service;

    const createToken = (overrides = {}, secret = tokenSecret) => {
        const issuedAt = Math.floor(Date.now() / 1000);

        return generateAes256GcmToken(
            {
                email: 'ada@example.com',
                passwordHash: 'hashed-password',
                name: 'Ada King Lovelace',
                sub: userId,
                iat: issuedAt,
                exp: issuedAt + 600,
                jti: 'b6f60c13-3094-4c06-9d8c-912f1f38d86d',
                ...overrides
            },
            createSigninTokenKey(secret)
        );
    };

    beforeEach(() => {
        jestApi.clearAllMocks();
        config.auth.basic.signinAes256GcmTokenSecret = tokenSecret;
        userRepository = {
            findById: jestApi.fn().mockResolvedValue(null),
            create: jestApi.fn().mockImplementation(async (attributes) => ({
                id: userId,
                ...attributes
            }))
        };
        userPasswordRepository = {
            create: jestApi.fn().mockResolvedValue({})
        };
        userExistenceRepository = {
            setById: jestApi.fn().mockResolvedValue(undefined)
        };
        userLockRepository = {
            acquire: jestApi.fn().mockResolvedValue(true),
            release: jestApi.fn().mockResolvedValue(1)
        };
        sequelize = {
            transaction: jestApi.fn((callback) => callback(transaction))
        };
        service = createVerifyEmailService({
            userRepository,
            userPasswordRepository,
            userExistenceRepository,
            userLockRepository,
            mysqlSequelizeClient: sequelize
        });
    });

    afterAll(() => {
        config.auth.basic.signinAes256GcmTokenSecret = originalSecret;
    });

    test('creates the user and password in one transaction and returns public fields', async () => {
        const requestLogger = { debug: jestApi.fn() };
        const result = await service.verifyEmail(createToken(), requestLogger);

        expect(requestLogger.debug).toHaveBeenCalled();
        expect(userRepository.findById).toHaveBeenCalledWith(userId);
        expect(userRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                id: userId,
                email: 'ada@example.com',
                firstName: 'Ada',
                lastName: 'King Lovelace'
            }),
            { transaction }
        );
        expect(userPasswordRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId,
                passwordHash: 'hashed-password'
            }),
            { transaction }
        );
        expect(mockCacheAuthenticatedUser).toHaveBeenCalledWith(
            { userExistenceRepository, userLockRepository },
            userId,
            expect.anything()
        );
        expect(result).toEqual({
            conflict: false,
            response: {
                success: true,
                message: 'Email verification successful.'
            },
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
        });
    });

    test('stores a null last name for a single-word name', async () => {
        await service.verifyEmail(createToken({ name: 'Ada' }));

        expect(userRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                id: userId,
                email: 'ada@example.com',
                firstName: 'Ada',
                lastName: null
            }),
            { transaction }
        );
    });

    test.each([
        ['malformed', () => 'not-a-token'],
        ['tampered', () => `${createToken().slice(0, -2)}AA`],
        ['signed with another secret', () => createToken({}, `${tokenSecret}-other`)],
        ['expired', () => createToken({ exp: Math.floor(Date.now() / 1000) - 1 })],
        ['missing fields', () => createToken({ passwordHash: undefined })]
    ])('rejects a %s token without touching the database', async (label, getToken) => {
        await expect(service.verifyEmail(getToken())).rejects.toThrow();
        expect(userRepository.findById).not.toHaveBeenCalled();
        expect(sequelize.transaction).not.toHaveBeenCalled();
    });

    test('returns a conflict response when the verification token has already been used', async () => {
        userRepository.findById.mockResolvedValue({
            id: userId,
            email: 'ada@example.com'
        });

        await expect(service.verifyEmail(createToken())).resolves.toEqual({
            conflict: true,
            response: {
                success: true,
                message: 'An account with this ID already exists.'
            }
        });
        expect(sequelize.transaction).not.toHaveBeenCalled();
    });

    test('maps a concurrent duplicate account to a conflict response', async () => {
        sequelize.transaction.mockRejectedValue(
            Object.assign(new Error('Duplicate entry'), {
                name: 'SequelizeUniqueConstraintError'
            })
        );

        await expect(service.verifyEmail(createToken())).resolves.toEqual({
            conflict: true,
            response: {
                success: false,
                message: 'An account with this ID already exists.'
            }
        });
    });

    test('does not hide unexpected database errors', async () => {
        const error = new Error('database unavailable');
        sequelize.transaction.mockRejectedValue(error);

        await expect(service.verifyEmail(createToken())).rejects.toBe(error);
    });

    test('fails when the encryption secret is missing or weak', () => {
        config.auth.basic.signinAes256GcmTokenSecret = 'too-short';

        expect(() => createVerifyEmailService({
            userRepository, userPasswordRepository, mysqlSequelizeClient: sequelize
        })).toThrow(
            'Sign-in token encryption requires a secret of at least 32 bytes'
        );
    });
});
