const { describe, test, expect } = require('@jest/globals');
const request = require('supertest');

const app = require('../../src/healthApp');

describe('Health application', () => {
    test('reports that startup has completed', async () => {
        const response = await request(app).get('/startup');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Startup check passed'
        });
    });
});
