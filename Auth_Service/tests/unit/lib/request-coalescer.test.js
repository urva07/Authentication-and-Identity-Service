const {
    describe,
    test,
    expect,
    jest: jestApi
} = require('@jest/globals');
const requestCoalescer = require('../../../src/lib/requestCoalescer');

describe('request coalescer', () => {
    test('shares an in-flight request for the same key', async () => {
        let resolveRequest;
        const requestFn = jestApi.fn(() => new Promise((resolve) => {
            resolveRequest = resolve;
        }));

        const firstRequest = requestCoalescer('same-key', requestFn);
        const secondRequest = requestCoalescer('same-key', requestFn);

        expect(requestFn).toHaveBeenCalledTimes(1);
        resolveRequest({ value: 'shared-result' });
        await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
            { value: 'shared-result' },
            { value: 'shared-result' }
        ]);
    });

    test('does not coalesce requests with different keys', async () => {
        const requestFn = jestApi.fn()
            .mockResolvedValueOnce('first')
            .mockResolvedValueOnce('second');

        await expect(Promise.all([
            requestCoalescer('first-key', requestFn),
            requestCoalescer('second-key', requestFn)
        ])).resolves.toEqual(['first', 'second']);
        expect(requestFn).toHaveBeenCalledTimes(2);
    });

    test('clears a failed request so a later call can retry', async () => {
        const failure = new Error('upstream unavailable');
        const requestFn = jestApi.fn()
            .mockRejectedValueOnce(failure)
            .mockResolvedValueOnce('recovered');

        await expect(requestCoalescer('retry-key', requestFn)).rejects.toBe(failure);
        await expect(requestCoalescer('retry-key', requestFn)).resolves.toBe(
            'recovered'
        );
        expect(requestFn).toHaveBeenCalledTimes(2);
    });

    test('does not include the coalescing key in debug logs', async () => {
        let resolveRequest;
        const logger = { debug: jestApi.fn() };
        const sensitiveKey = 'mysql:userrepository:findbyemail:["private@example.com"]';
        const requestFn = jestApi.fn(() => new Promise((resolve) => {
            resolveRequest = resolve;
        }));

        const firstRequest = requestCoalescer(sensitiveKey, requestFn, logger);
        const secondRequest = requestCoalescer(sensitiveKey, requestFn, logger);
        resolveRequest(null);
        await Promise.all([firstRequest, secondRequest]);

        expect(logger.debug).toHaveBeenCalled();
        expect(requestFn).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(logger.debug.mock.calls)).not.toContain('private@example.com');
    });
});
