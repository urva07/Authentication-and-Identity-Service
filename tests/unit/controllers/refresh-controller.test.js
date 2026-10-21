const createRefreshController = require('../../../src/controllers/refresh.controller');

describe('refresh controller', () => {
    test('passes the authenticated user to the service and sets the refresh-token cookie', async () => {
        const user = { id: '42' };
        const refreshService = {
            refreshAccessToken: jest.fn().mockReturnValue('signed-access-token')
        };
        const controller = createRefreshController(refreshService);
        const res = {
            cookie: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        await controller.post({ user }, res, next);

        expect(refreshService.refreshAccessToken).toHaveBeenCalledWith(user);
        expect(res.cookie).toHaveBeenCalledWith(
            'refresh_token',
            'signed-access-token',
            expect.objectContaining({
                httpOnly: false,
                sameSite: 'lax',
                path: '/'
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true
        });
        expect(res.json.mock.calls[0][0]).not.toHaveProperty('data.accessToken');
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service errors to error middleware', async () => {
        const error = new Error('token signing failed');
        const controller = createRefreshController({
            refreshAccessToken: jest.fn().mockRejectedValue(error)
        });
        const next = jest.fn();

        await controller.post(
            { user: { id: '42' } },
            { cookie: jest.fn(), status: jest.fn(), json: jest.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
