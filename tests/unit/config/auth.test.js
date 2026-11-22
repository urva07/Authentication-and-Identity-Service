jest.mock('#src/utils/logger.js', () => ({
    fatal: jest.fn()
}));

describe('authentication configuration', () => {
    const originalExit = process.exit;
    const originalSecrets = {
        INGRESS_SHARED_SECRET: process.env.INGRESS_SHARED_SECRET,
        SESSION_SECRET: process.env.SESSION_SECRET,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_TOKEN_SECRET,
        JWT_ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_TOKEN_SECRET,
        JWT_PASSWORD_RESET_TOKEN_SECRET: process.env.JWT_PASSWORD_RESET_TOKEN_SECRET,
        BASIC_SIGNIN_AES_256_GCM_TOKEN_SECRET: process.env.BASIC_SIGNIN_AES_256_GCM_TOKEN_SECRET
    };

    afterEach(() => {
        process.exit = originalExit;
        for (const [name, value] of Object.entries(originalSecrets)) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
        jest.resetModules();
    });

    test('logs at fatal level and exits for missing or short critical secrets', () => {
        process.env.JWT_ACCESS_TOKEN_SECRET = 'short';
        process.exit = jest.fn();

        jest.isolateModules(() => {
            require('../../../src/config/config/auth');
            const logger = require('#src/utils/logger.js');
            expect(logger.fatal).toHaveBeenCalledWith(
                { invalidSecrets: ['JWT_ACCESS_TOKEN_SECRET'] },
                'Critical authentication configuration is missing or invalid'
            );
        });

        expect(process.exit).toHaveBeenCalledWith(1);
    });
});
