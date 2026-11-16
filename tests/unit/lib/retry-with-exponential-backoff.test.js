const { afterEach, describe, expect, jest: jestApi, test } = require('@jest/globals');
const { retryWithExponentialBackoff } = require('../../../src/lib');

describe('retryWithExponentialBackoff', () => {
    afterEach(() => jestApi.useRealTimers());

    test('returns immediately when the operation succeeds', async () => {
        const operation = jestApi.fn().mockResolvedValue('done');
        await expect(retryWithExponentialBackoff(operation)).resolves.toBe('done');
        expect(operation).toHaveBeenCalledTimes(1);
    });

    test('retries with exponentially increasing delays until success', async () => {
        jestApi.useFakeTimers();
        const operation = jestApi.fn()
            .mockRejectedValueOnce(new Error('first'))
            .mockRejectedValueOnce(new Error('second'))
            .mockResolvedValue('done');
        const result = retryWithExponentialBackoff(operation, 3, 10);

        await jestApi.advanceTimersByTimeAsync(9);
        expect(operation).toHaveBeenCalledTimes(1);
        await jestApi.advanceTimersByTimeAsync(1);
        expect(operation).toHaveBeenCalledTimes(2);
        await jestApi.advanceTimersByTimeAsync(19);
        expect(operation).toHaveBeenCalledTimes(2);
        await jestApi.advanceTimersByTimeAsync(1);
        await expect(result).resolves.toBe('done');
        expect(operation).toHaveBeenCalledTimes(3);
    });

    test('throws the last error after the configured attempts', async () => {
        jestApi.useFakeTimers();
        const error = new Error('still unavailable');
        const operation = jestApi.fn().mockRejectedValue(error);
        const result = retryWithExponentialBackoff(operation, 3, 10);
        const rejection = expect(result).rejects.toBe(error);

        await jestApi.runAllTimersAsync();
        await rejection;
        expect(operation).toHaveBeenCalledTimes(3);
    });
});
