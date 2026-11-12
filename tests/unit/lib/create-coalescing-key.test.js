const { describe, expect, test } = require('@jest/globals');
const createCoalescingKey = require('../../../src/lib/createCoalescingKey');

describe('createCoalescingKey', () => {
    test('normalizes UUID case for MySQL user ID lookups', () => {
        const upperCaseKey = createCoalescingKey({
            db: 'mysql',
            repository: 'userRepository',
            method: 'findById',
            args: ['A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11']
        });
        const lowerCaseKey = createCoalescingKey({
            db: 'mysql',
            repository: 'userRepository',
            method: 'findById',
            args: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11']
        });

        expect(upperCaseKey).toBe(lowerCaseKey);
    });

    test('normalizes UUID case for MySQL password lookups', () => {
        const upperCaseKey = createCoalescingKey({
            db: 'mysql',
            repository: 'userPasswordRepository',
            method: 'findByUserId',
            args: ['A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11']
        });
        const lowerCaseKey = createCoalescingKey({
            db: 'mysql',
            repository: 'userPasswordRepository',
            method: 'findByUserId',
            args: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11']
        });

        expect(upperCaseKey).toBe(lowerCaseKey);
    });

    test('does not normalize case-sensitive provider identity arguments', () => {
        const upperCaseKey = createCoalescingKey({
            db: 'mysql',
            repository: 'identityProviderRepository',
            method: 'findByProviderIdentity',
            args: ['google', 'ProviderUserID']
        });
        const lowerCaseKey = createCoalescingKey({
            db: 'mysql',
            repository: 'identityProviderRepository',
            method: 'findByProviderIdentity',
            args: ['google', 'provideruserid']
        });

        expect(upperCaseKey).not.toBe(lowerCaseKey);
    });
});
