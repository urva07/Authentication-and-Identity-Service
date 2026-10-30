const createVerifyEmailController = require('#src/controllers/mainApp/v1/auth/verify-email.controller.js');

describe('verify email controller', () => {
    const createResponse = () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    });

    test('passes the query token to the service and returns the created user', async () => {
        const user = { id: 'user-id', email: 'ada@example.com' };
        const verifyEmailService = {
            verifyEmail: jest.fn().mockResolvedValue(user)
        };
        const controller = createVerifyEmailController(verifyEmailService);
        const res = createResponse();
        const next = jest.fn();

        await controller.get({ query: { token: 'v1.token' } }, res, next);

        expect(verifyEmailService.verifyEmail).toHaveBeenCalledWith('v1.token');
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Email verified successfully. You can now log in.',
            user
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service errors to error middleware', async () => {
        const error = new Error('verification failed');
        const verifyEmailService = {
            verifyEmail: jest.fn().mockRejectedValue(error)
        };
        const controller = createVerifyEmailController(verifyEmailService);
        const res = createResponse();
        const next = jest.fn();

        await controller.get({ query: { token: 'v1.token' } }, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
    });
});
