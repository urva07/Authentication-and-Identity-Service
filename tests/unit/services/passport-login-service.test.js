const {
    afterEach,
    describe,
    expect,
    jest: jestApi,
    test
} = require('@jest/globals');

const mockGenerateAccessToken = jestApi.fn(() => 'access-token');
const mockGenerateRefreshToken = jestApi.fn(() => 'refresh-token');
const mockCacheAuthenticatedUser = jestApi.fn().mockResolvedValue(undefined);

jestApi.mock('#src/utils/jwt.js', () => ({
    generateAccessToken: (...args) => mockGenerateAccessToken(...args),
    generateRefreshToken: (...args) => mockGenerateRefreshToken(...args)
}));

jestApi.mock('#src/lib/index.js', () => {
    const actual = jestApi.requireActual('#src/lib/index.js');
    return {
        ...actual,
        cacheAuthenticatedUser: (...args) => mockCacheAuthenticatedUser(...args)
    };
});

const createPassportLoginService = require('../../../src/services/mainApp/auth/passportLogin.service');

describe('passport login service', () => {
    afterEach(() => {
        jestApi.clearAllMocks();
    });

    test('generates tokens, caches the user, and returns public login fields', async () => {
        const userExistenceRepository = { setById: jestApi.fn() };
        const userLockRepository = { acquire: jestApi.fn(), release: jestApi.fn() };
        const service = createPassportLoginService({
            userExistenceRepository,
            userLockRepository
        });
        const logger = { debug: jestApi.fn() };

        await expect(service.loginUser({
            id: 'user-id',
            email: 'ada@example.com',
            firstName: 'Ada',
            lastName: 'Lovelace'
        }, logger)).resolves.toEqual({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user: {
                id: 'user-id',
                email: 'ada@example.com',
                firstName: 'Ada',
                lastName: 'Lovelace'
            }
        });

        expect(mockGenerateAccessToken).toHaveBeenCalledWith('user-id');
        expect(mockGenerateRefreshToken).toHaveBeenCalledWith('user-id');
        expect(mockCacheAuthenticatedUser).toHaveBeenCalledWith(
            { userExistenceRepository, userLockRepository },
            'user-id',
            logger
        );
    });

    test('rejects a missing Passport user', async () => {
        const service = createPassportLoginService();
        const logger = { debug: jestApi.fn() };

        await expect(service.loginUser(null, logger)).rejects.toMatchObject({
            name: 'AuthenticationError',
            message: 'Invalid Username or Password'
        });
        expect(mockCacheAuthenticatedUser).not.toHaveBeenCalled();
    });
});
