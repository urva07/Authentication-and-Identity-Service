const { describe, test, expect } = require('@jest/globals');
const ExternalServiceError = require('../../../src/errors/ExternalServiceError');
const PayloadTooLargeError = require('../../../src/errors/PayloadTooLargeError');

describe('external service errors', () => {
    test('uses the external-service defaults', () => {
        const error = new ExternalServiceError();

        expect(error).toMatchObject({
            name: 'ExternalServiceError',
            message: 'External service error',
            statusCode: 502
        });
    });

    test('preserves custom external-service details', () => {
        const error = new ExternalServiceError('Mail provider unavailable', 503);

        expect(error).toMatchObject({
            name: 'ExternalServiceError',
            message: 'Mail provider unavailable',
            statusCode: 503
        });
    });

    test('uses the payload-too-large defaults and accepts overrides', () => {
        expect(new PayloadTooLargeError()).toMatchObject({
            name: 'PayloadTooLargeError',
            message: 'Payload Too Large',
            statusCode: 413
        });
        expect(new PayloadTooLargeError('Request exceeds limit', 400))
            .toMatchObject({
                name: 'PayloadTooLargeError',
                message: 'Request exceeds limit',
                statusCode: 400
            });
    });
});
