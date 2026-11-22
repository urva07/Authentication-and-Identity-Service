jest.mock('#src/utils/logger.js', () => ({
    fatal: jest.fn()
}));

describe('database configuration', () => {
    const originalExit = process.exit;
    const redisVariables = [
        'SESSION_REDIS_HOST',
        'SESSION_REDIS_PASSWORD',
        'USER_CACHE_REDIS_HOST',
        'USER_CACHE_REDIS_PASSWORD',
        'RATE_LIMIT_REDIS_HOST',
        'RATE_LIMIT_REDIS_PASSWORD'
    ];
    const originalValues = Object.fromEntries(
        redisVariables.map((name) => [name, process.env[name]])
    );
    const originalMysqlValues = {
        MYSQL_USER: process.env.MYSQL_USER,
        MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
        MYSQL_HOST: process.env.MYSQL_HOST,
        MYSQL_PORT: process.env.MYSQL_PORT,
        MYSQL_DATABASE: process.env.MYSQL_DATABASE
    };

    afterEach(() => {
        process.exit = originalExit;
        for (const [name, value] of Object.entries({
            ...originalValues,
            ...originalMysqlValues
        })) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
        jest.resetModules();
    });

    test('logs at fatal level and exits for missing Redis configuration', () => {
        delete process.env.SESSION_REDIS_PASSWORD;
        process.exit = jest.fn();

        jest.isolateModules(() => {
            require('../../../src/config/config/database');
            const logger = require('#src/utils/logger.js');
            expect(logger.fatal).toHaveBeenCalledWith(
                { invalidConfigs: ['SESSION_REDIS'] },
                'Critical database configuration is missing or invalid'
            );
        });

        expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('logs at fatal level and exits for invalid MySQL port', () => {
        process.env.MYSQL_PORT = '70000';
        process.exit = jest.fn();

        jest.isolateModules(() => {
            require('../../../src/config/config/database');
            const logger = require('#src/utils/logger.js');
            expect(logger.fatal).toHaveBeenCalledWith(
                { invalidConfigs: ['MYSQL'] },
                'Critical database configuration is missing or invalid'
            );
        });

        expect(process.exit).toHaveBeenCalledWith(1);
    });
});
