jest.mock('#src/utils/logger.js', () => ({
    fatal: jest.fn()
}));

describe('email configuration', () => {
    const originalExit = process.exit;
    const variables = [
        'EMAIL_HOST',
        'EMAIL_PORT',
        'EMAIL_FROM',
        'EMAIL_USER',
        'EMAIL_PASSWORD'
    ];
    const originalValues = Object.fromEntries(
        variables.map((name) => [name, process.env[name]])
    );

    afterEach(() => {
        process.exit = originalExit;
        for (const [name, value] of Object.entries(originalValues)) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
        jest.resetModules();
    });

    test('logs at fatal level and exits for missing required SMTP settings', () => {
        delete process.env.EMAIL_HOST;
        process.exit = jest.fn();

        jest.isolateModules(() => {
            require('../../../src/config/config/email');
            const logger = require('#src/utils/logger.js');
            expect(logger.fatal).toHaveBeenCalledWith(
                { invalidConfigs: ['EMAIL_HOST'] },
                'Critical email configuration is missing or invalid'
            );
        });

        expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('logs at fatal level and exits for invalid SMTP port', () => {
        process.env.EMAIL_PORT = '70000';
        process.exit = jest.fn();

        jest.isolateModules(() => {
            require('../../../src/config/config/email');
            const logger = require('#src/utils/logger.js');
            expect(logger.fatal).toHaveBeenCalledWith(
                { invalidConfigs: ['EMAIL_PORT'] },
                'Critical email configuration is missing or invalid'
            );
        });

        expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('logs at fatal level and exits when only one credential is set', () => {
        delete process.env.EMAIL_PASSWORD;
        process.env.EMAIL_USER = 'mailer@example.com';
        process.exit = jest.fn();

        jest.isolateModules(() => {
            require('../../../src/config/config/email');
            const logger = require('#src/utils/logger.js');
            expect(logger.fatal).toHaveBeenCalledWith(
                { invalidConfigs: ['EMAIL_USER/EMAIL_PASSWORD'] },
                'Critical email configuration is missing or invalid'
            );
        });

        expect(process.exit).toHaveBeenCalledWith(1);
    });
});
