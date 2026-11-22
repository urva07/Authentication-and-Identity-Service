const { describe, test, expect } = require('@jest/globals');
const { hashPassword, verifyPassword } = require('../../../src/utils/hashPasswordAndVerify');

describe('password hashing', () => {
    test('hashes and verifies a password', async () => {
        const hash = await hashPassword('test-password', 4);

        await expect(verifyPassword('test-password', hash)).resolves.toBe(true);
        await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
    });
});
