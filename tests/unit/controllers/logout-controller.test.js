const createLogoutController = require('#src/controllers/v1/logout.controller.js');

describe('logout controller', () => {
    test('clears access and refresh token cookies after logout service succeeds', async () => {
        const logoutService = {
            logoutUser: jest.fn().mockReturnValue({ loggedOut: true })
        };
        const controller = createLogoutController(logoutService);
        const res = {
            clearCookie: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        await controller.post({}, res, next);

        expect(logoutService.logoutUser).toHaveBeenCalledWith();
        expect(res.clearCookie).toHaveBeenCalledWith(
            'auth_token',
            expect.objectContaining({ path: '/' })
        );
        expect(res.clearCookie).toHaveBeenCalledWith(
            'refresh_token',
            expect.objectContaining({ path: '/' })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards logout service errors to error middleware', async () => {
        const error = new Error('logout failed');
        const controller = createLogoutController({
            logoutUser: jest.fn().mockRejectedValue(error)
        });
        const next = jest.fn();

        await controller.post(
            {},
            { clearCookie: jest.fn(), status: jest.fn(), json: jest.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
