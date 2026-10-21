const createLogoutService = require('../../../src/services/logout.service');

describe('logout service', () => {
    test('reports completion of stateless logout', () => {
        const logoutService = createLogoutService();
        expect(logoutService.logoutUser()).toEqual({ loggedOut: true });
    });
});
