const {
    afterEach,
    describe,
    expect,
    jest: jestApi,
    test
} = require('@jest/globals');

const mockVerifyPassword = jestApi.fn();

jestApi.mock('#src/utils/hashPasswordAndVerify.js', () => ({
    verifyPassword: (...args) => mockVerifyPassword(...args)
}));

jestApi.mock('#src/lib/index.js', () => ({
    createCoalescingKey: jestApi.fn(() => (args) => JSON.stringify(args))
}));

jestApi.mock('#src/lib/requestCoalescer.js', () =>
    jestApi.fn(async (_key, operation) => operation())
);

const {
    createBasicAuthenticationCallback
} = require('../../../src/config/passport/basic');

const setup = ({ user = null, passwordValid = false, lookupError = null } = {}) => {
    const userRepository = {
        findByEmailWithPassword: lookupError
            ? jestApi.fn().mockRejectedValue(lookupError)
            : jestApi.fn().mockResolvedValue(user)
    };
    const verify = createBasicAuthenticationCallback({ userRepository });

    mockVerifyPassword.mockReset();
    mockVerifyPassword.mockResolvedValue(passwordValid);

    const request = { log: { debug: jestApi.fn() } };
    const run = (email = 'ada@example.com', password = 'test-password') =>
        new Promise((resolve) => {
            verify(request, email, password, (error, authenticatedUser) => {
                resolve({ error, authenticatedUser });
            });
        });

    return { run, request, userRepository };
};

describe('basic Passport authentication callback', () => {
    afterEach(() => {
        jestApi.clearAllMocks();
    });

    test('rejects an unknown user', async () => {
        const { run, userRepository } = setup();

        const result = await run();

        expect(result.error).toMatchObject({
            name: 'AuthenticationError',
            message: 'Invalid Username or Password'
        });
        expect(result.authenticatedUser).toBeUndefined();
        expect(userRepository.findByEmailWithPassword).toHaveBeenCalledWith('ada@example.com');
        expect(mockVerifyPassword).not.toHaveBeenCalled();
    });

    test('rejects a user without a stored password', async () => {
        const { run } = setup({ user: { id: 'user-id' } });

        const result = await run();

        expect(result.error).toMatchObject({
            name: 'AuthenticationError',
            message: 'Invalid Username or Password'
        });
        expect(mockVerifyPassword).not.toHaveBeenCalled();
    });

    test('rejects an invalid password', async () => {
        const { run } = setup({
            user: { id: 'user-id', password: 'stored-password-hash' },
            passwordValid: false
        });

        const result = await run();

        expect(result.error).toMatchObject({
            name: 'AuthenticationError',
            message: 'Invalid Username or Password'
        });
        expect(mockVerifyPassword).toHaveBeenCalledWith(
            'test-password',
            'stored-password-hash'
        );
    });

    test('passes the authenticated user after password verification', async () => {
        const user = {
            id: 'user-id',
            password: { passwordHash: 'stored-password-hash' }
        };
        const { run } = setup({ user, passwordValid: true });

        const result = await run();

        expect(result.error).toBeNull();
        expect(result.authenticatedUser).toBe(user);
        expect(mockVerifyPassword).toHaveBeenCalledWith(
            'test-password',
            'stored-password-hash'
        );
    });

    test('uses the request-scoped logger', async () => {
        const { run, request } = setup();

        await run();

        expect(request.log.debug).toHaveBeenCalledWith(
            'Basic authentication attempt started'
        );
    });

    test('passes unexpected repository or verification errors to Passport', async () => {
        const lookupError = new Error('Database unavailable');
        const { run } = setup({ lookupError });

        const result = await run();

        expect(result.error).toBe(lookupError);
        expect(result.authenticatedUser).toBeUndefined();
    });
});
