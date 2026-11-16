const { describe, expect, test } = require('@jest/globals');
const createCoalescingKey = require('../../../src/lib/createCoalescingKey');

describe('createCoalescingKey', () => {
    test('creates stable keys for equivalent arguments', () => {
        const key = createCoalescingKey({ db: 'MySQL', repository: 'UserRepository', method: 'findById' });

        expect(key([{ b: 2, a: 1 }])).toBe(key([{ a: 1, b: 2 }]));
        expect(key(['a'])).not.toBe(key(['b']));
    });

    test('preserves case-sensitive argument values', () => {
        const key = createCoalescingKey({
            db: 'mysql', repository: 'identityProviderRepository', method: 'findByProviderIdentity'
        });

        expect(key(['google', 'ProviderUserID'])).not.toBe(key(['google', 'provideruserid']));
    });

    test('distinguishes Redis instances from other databases', () => {
        const redisKey = createCoalescingKey({
            db: 'redis', redisInstance: 'userCache', repository: 'userRepository', method: 'findById'
        });
        const mysqlKey = createCoalescingKey({ db: 'mysql', repository: 'userRepository', method: 'findById' });

        expect(redisKey(['id'])).not.toBe(mysqlKey(['id']));
    });

    test('rejects invalid configuration and arguments', () => {
        expect(() => createCoalescingKey({ db: 'redis', repository: 'users', method: 'get' })).toThrow();
        expect(() => createCoalescingKey({ db: 'unknown', repository: 'users', method: 'get' })).toThrow();
        const key = createCoalescingKey({ db: 'mysql', repository: 'users', method: 'get' });
        expect(() => key('id')).toThrow();
        expect(() => key([undefined])).toThrow();
    });
});
