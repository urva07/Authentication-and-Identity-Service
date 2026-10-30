const config = require('#src/config/config.js');
const { AppError, ConflictError } = require('#src/errors/index.js');
const { generateAes256GcmToken } = require('#src/utils/aes256GcmToken.js');
const { createSigninTokenKey } = require('#src/utils/signinTokenKey.js');
const createVerifyEmailService = require('#src/services/mainApp/auth/verify-email.service.js');

describe('verify email service', () => {
    const tokenSecret = 'b7f2c9a4e1d6380f5a0e9d3c7b1f6428c4e8a2f6d0b9137e1f5c8b3a6d2e9047';
    const originalSecret = config.auth.basic.signinAes256GcmTokenSecret;
    const userId = '3f0c1d52-8a7e-4b1c-9d34-5e6f7a8b9c0d';
    const transaction = { id: 'transaction' };
    let userRepository;
    let userPasswordRepository;
    let sequelize;
    let service;

    const createToken = (overrides = {}, secret = tokenSecret) => {
        const issuedAt = Math.floor(Date.now() / 1000);

        return generateAes256GcmToken(
            {
                email: 'ada@example.com',
                passwordHash: 'hashed-password',
                name: 'Ada King Lovelace',
                iat: issuedAt,
                exp: issuedAt + 600,
                ...overrides
            },
            createSigninTokenKey(secret)
        );
    };

    beforeEach(() => {
        config.auth.basic.signinAes256GcmTokenSecret = tokenSecret;
        userRepository = {
            findByEmail: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(async (attributes) => ({
                id: userId,
                ...attributes
            }))
        };
        userPasswordRepository = {
            create: jest.fn().mockResolvedValue({})
        };
        sequelize = {
            transaction: jest.fn((callback) => callback(transaction))
        };
        service = createVerifyEmailService({
            userRepository,
            userPasswordRepository,
            sequelize
        });
    });

    afterAll(() => {
        config.auth.basic.signinAes256GcmTokenSecret = originalSecret;
    });

    test('creates the user and password in one transaction and returns public fields', async () => {
        const result = await service.verifyEmail(createToken());

        expect(userRepository.findByEmail).toHaveBeenCalledWith('ada@example.com');
        expect(userRepository.create).toHaveBeenCalledWith(
            { email: 'ada@example.com', firstName: 'Ada', lastName: 'King Lovelace' },
            { transaction }
        );
        expect(userPasswordRepository.create).toHaveBeenCalledWith(
            { userId, passwordHash: 'hashed-password' },
            { transaction }
        );
        expect(result).toEqual({
            id: userId,
            email: 'ada@example.com',
            firstName: 'Ada',
            lastName: 'King Lovelace'
        });
    });

    test('stores a null last name for a single-word name', async () => {
        await service.verifyEmail(createToken({ name: 'Ada' }));

        expect(userRepository.create).toHaveBeenCalledWith(
            { email: 'ada@example.com', firstName: 'Ada', lastName: null },
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
        await expect(service.verifyEmail(getToken())).rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid or expired verification link'
        });
        await expect(service.verifyEmail(getToken())).rejects.toBeInstanceOf(AppError);
        expect(userRepository.findByEmail).not.toHaveBeenCalled();
        expect(sequelize.transaction).not.toHaveBeenCalled();
    });

    test('rejects an email that already belongs to a user', async () => {
        userRepository.findByEmail.mockResolvedValue({ id: userId });

        await expect(service.verifyEmail(createToken())).rejects.toBeInstanceOf(
            ConflictError
        );
        expect(sequelize.transaction).not.toHaveBeenCalled();
    });

    test('maps a concurrent duplicate email to a conflict', async () => {
        sequelize.transaction.mockRejectedValue(
            Object.assign(new Error('Duplicate entry'), {
                name: 'SequelizeUniqueConstraintError'
            })
        );

        await expect(service.verifyEmail(createToken())).rejects.toMatchObject({
            name: 'ConflictError',
            statusCode: 409
        });
    });

    test('does not hide unexpected database errors', async () => {
        const error = new Error('database unavailable');
        sequelize.transaction.mockRejectedValue(error);

        await expect(service.verifyEmail(createToken())).rejects.toBe(error);
    });

    test('fails when the encryption secret is missing or weak', async () => {
        config.auth.basic.signinAes256GcmTokenSecret = 'too-short';

        await expect(service.verifyEmail(createToken())).rejects.toThrow(
            'Sign-in token encryption requires a secret of at least 32 bytes'
        );
    });
});
