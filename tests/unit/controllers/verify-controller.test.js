const createVerifyController = require('#src/controllers/v1/verify.controller.js');

describe('verify controller', () => {
    test('passes the authenticated identity to the service and returns its result', async () => {
        const user = { id: '42' };
        const result = { id: '42', email: 'ada@example.com' };
        const verifyService = {
            verifyUser: jest.fn().mockResolvedValue(result)
        };
        const controller = createVerifyController(verifyService);
        const req = { user };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        await controller.post(req, res, next);

        expect(verifyService.verifyUser).toHaveBeenCalledWith('42');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            user: result
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service errors to error middleware', async () => {
        const error = new Error('user lookup failed');
        const controller = createVerifyController({
            verifyUser: jest.fn().mockRejectedValue(error)
        });
        const next = jest.fn();

        await controller.post(
            { user: { id: '42' } },
            { status: jest.fn(), json: jest.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
