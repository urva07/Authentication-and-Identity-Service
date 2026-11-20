const { describe, test, expect } = require('@jest/globals');
const { generateUniqueUserId, generateUUID } = require('../../../src/utils/userIdGenerator');

describe('user ID generators', () => {
    test('generates a 32-character hexadecimal user ID', () => {
        expect(generateUniqueUserId()).toMatch(/^[0-9a-f]{32}$/);
    });

    test('generates a valid UUID', () => {
        expect(generateUUID()).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
    });
});
