jest.mock('#src/utils/logger.js', () => ({
    fatal: jest.fn()
}));

describe('application configuration', () => {
    const originalExit = process.exit;
    const variables = ['PORT', 'HEALTH_APP_PORT', 'API_BASE_URL'];
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

    test('logs at fatal level and exits for an invalid main port', () => {
        process.env.PORT = '70000';
        process.exit = jest.fn();

        jest.isolateModules(() => {
            require('../../../src/config/config/apps');
            const logger = require('#src/utils/logger.js');
            expect(logger.fatal).toHaveBeenCalledWith(
                { invalidConfigs: ['PORT'] },
                'Critical application configuration is missing or invalid'
            );
        });

        expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('logs at fatal level and exits for an invalid API URL', () => {
        process.env.API_BASE_URL = 'not-a-url';
        process.exit = jest.fn();

        jest.isolateModules(() => {
            require('../../../src/config/config/apps');
            const logger = require('#src/utils/logger.js');
            expect(logger.fatal).toHaveBeenCalledWith(
                { invalidConfigs: ['API_BASE_URL'] },
                'Critical application configuration is missing or invalid'
            );
        });

        expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('logs at fatal level and exits when both servers use the same port', () => {
        process.env.PORT = '3000';
        process.env.HEALTH_APP_PORT = '3000';
        process.exit = jest.fn();

        jest.isolateModules(() => {
            require('../../../src/config/config/apps');
            const logger = require('#src/utils/logger.js');
            expect(logger.fatal).toHaveBeenCalledWith(
                { invalidConfigs: ['PORT/HEALTH_APP_PORT'] },
                'Critical application configuration is missing or invalid'
            );
        });

        expect(process.exit).toHaveBeenCalledWith(1);
    });
});
