const { describe, test, expect } = require('@jest/globals');
const request = require('supertest');

const app = require('../../src/healthApp');

describe('Health probe routes', () => {
    test.each(['/live', '/ready'])(
        'GET %s is registered without probe logic',
        async (path) => {
            const response = await request(app).get(path);

            expect(response.statusCode).toBe(501);
            expect(response.body).toEqual({
                success: false,
                message: 'Not implemented'
            });
        }
    );

    test('GET /metrics returns Prometheus process metrics', async () => {
        const response = await request(app).get('/metrics');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toMatch(
            /text\/plain(?=.*version=0\.0\.4)(?=.*charset=utf-8)/
        );
        expect(response.text).toContain('# HELP process_cpu_user_seconds_total');
        expect(response.text).toContain('process_cpu_user_seconds_total');
        expect(response.text).toContain('# HELP http_requests_total');
        expect(response.text).toContain('# HELP http_request_duration_seconds');
        expect(response.text).toContain('# HELP http_failed_requests_total');
        expect(response.text).toMatch(
            /http_requests_total\{method="GET",status_code="501"\} [1-9]\d*/
        );
        expect(response.text).toMatch(
            /http_failed_requests_total\{method="GET",status_code="501"\} [1-9]\d*/
        );
        expect(response.text).toMatch(
            /http_request_duration_seconds_count\{method="GET",status_code="501"\} [1-9]\d*/
        );
    });
});
