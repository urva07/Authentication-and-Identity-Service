const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const createVerifyController = require('../../../src/controllers/mainApp/v1/auth/verify.controller');

describe('verify controller', () => {
    test('passes the authenticated identity to the service and returns its result', async () => {
        const user = { id: '42' };
        const result = { id: '42', email: 'ada@example.com' };
        const verifyService = {
            verifyUser: jestApi.fn().mockResolvedValue(result)
        };
        const controller = createVerifyController(verifyService);
        const req = { user, log: { debug: jestApi.fn() } };
        const res = {
            header: jestApi.fn(),
            status: jestApi.fn().mockReturnThis(),
            send: jestApi.fn()
        };
        const next = jestApi.fn();

        await controller.post(req, res, next);

        expect(verifyService.verifyUser).toHaveBeenCalledWith(user, req.log);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.header).toHaveBeenCalledWith('x-user-id', result.id);
        // expect(res.header).toHaveBeenCalledWith('x-user-email', result.email);
        // expect(res.header).toHaveBeenCalledWith(
        //     'x-user-name',
        //     `${result.firstName} ${result.lastName}`
        // );
        expect(res.send).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service errors to error middleware', async () => {
        const error = new Error('user lookup failed');
        const controller = createVerifyController({
            verifyUser: jestApi.fn().mockRejectedValue(error)
        });
        const next = jestApi.fn();
        const requestLogger = { debug: jestApi.fn() };

        await controller.post(
            { user: { id: '42' }, log: requestLogger },
            { status: jestApi.fn(), json: jestApi.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
