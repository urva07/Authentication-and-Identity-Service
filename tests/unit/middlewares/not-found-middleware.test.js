const { NotFoundError } = require('../../../src/errors');
const notFoundMiddleware = require('../../../src/middlewares/notFound.middleware');

describe('not-found middleware', () => {
    test('forwards a route-specific NotFoundError', () => {
        const next = jest.fn();

        notFoundMiddleware(
            { method: 'GET', originalUrl: '/missing/path' },
            {},
            next
        );

        expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        expect(next.mock.calls[0][0]).toMatchObject({
            name: 'NotFoundError',
            statusCode: 404,
            message: 'Route not found: GET /missing/path',
            isOperational: true
        });
    });
});
