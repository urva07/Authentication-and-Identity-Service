const { describe, test, expect, jest: jestApi } = require('@jest/globals');
const createLogoutService = require('../../../src/services/mainApp/auth/logout.service');

describe('logout service', () => {
    test('reports completion of stateless logout', () => {
        const logoutService = createLogoutService();
        const requestLogger = { debug: jestApi.fn() };
        expect(logoutService.logoutUser(requestLogger)).toEqual({ loggedOut: true });
        expect(requestLogger.debug).toHaveBeenCalled();
    });
});
