const request = require('supertest');

const createHealthApp = require('../../src/healthApp');

describe('Health application', () => {
    test('returns 503 before the application has started', async () => {
        const app = createHealthApp(() => false);
        const response = await request(app).get('/startup');

        expect(response.statusCode).toBe(503);
        expect(response.body).toEqual({
            success: false,
            status: 'starting'
        });
    });

    test('returns 200 after the application has started', async () => {
        const app = createHealthApp(() => true);
        const response = await request(app).get('/startup');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true,
            status: 'started'
        });
    });
});
