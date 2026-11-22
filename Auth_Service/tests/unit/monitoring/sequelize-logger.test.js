const { describe, test, expect, jest: jestApi } = require('@jest/globals');
const createSequelizeLogger = require('../../../src/monitoring/sequelizeLogger');

describe('Sequelize query logger', () => {
    test('logs query timing to the default logger and metrics', () => {
        const observe = jestApi.fn();
        const logger = { debug: jestApi.fn() };
        const queryLogger = createSequelizeLogger({ observe })(
            'findById',
            'userRepository',
            logger
        );

        queryLogger('SELECT 1', 250);

        expect(logger.debug).toHaveBeenCalledWith(
            { repositoryName: 'userRepository', queryName: 'findById' },
            expect.stringContaining('0.25 seconds')
        );
        expect(observe).toHaveBeenCalledWith(
            { query_name: 'findById', repository_name: 'userRepository' },
            0.25
        );
    });

    test('logs SQL when timing is undefined without recording a metric', () => {
        const observe = jestApi.fn();
        const logger = { debug: jestApi.fn() };
        const queryLogger = createSequelizeLogger({ observe })(
            'create',
            'userRepository',
            logger
        );

        queryLogger('INSERT INTO users');

        expect(logger.debug).toHaveBeenCalled();
        expect(observe).not.toHaveBeenCalled();
    });
});
