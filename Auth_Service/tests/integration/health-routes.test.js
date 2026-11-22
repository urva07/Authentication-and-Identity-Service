const { beforeEach, describe, jest: jestApi, test, expect } = require('@jest/globals');
const request = require('supertest');

const app = require('../../src/healthApp');
const { dbs: { mysql: { sequelize } } } = require('../../src/infrastructure/database');

describe('Health probe routes', () => {
    beforeEach(() => {
        app.locals.startupComplete = false;
        app.locals.shuttingDown = false;
        jestApi.restoreAllMocks();
    });

    test('GET /live returns 200 while the process is running', async () => {
        const response = await request(app).get('/live');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Liveness check passed'
        });
    });

    test('GET /live returns 503 while shutting down', async () => {
        app.locals.shuttingDown = true;

        const response = await request(app).get('/live');

        expect(response.statusCode).toBe(503);
        expect(response.body).toEqual({
            success: false,
            message: 'Liveness check failed'
        });
    });

    test('GET /ready returns 503 before startup completes', async () => {
        const response = await request(app).get('/ready');

        expect(response.statusCode).toBe(503);
        expect(response.body).toEqual({
            success: false,
            message: 'Readiness check failed'
        });
    });

    test('GET /ready returns 200 after startup completes', async () => {
        app.locals.startupComplete = true;
        jestApi.spyOn(sequelize, 'query').mockResolvedValue([[{ '1': 1 }]]);

        const response = await request(app).get('/ready');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Readiness check passed'
        });
    });

    test('GET /ready returns 503 while shutting down', async () => {
        app.locals.startupComplete = true;
        app.locals.shuttingDown = true;

        const response = await request(app).get('/ready');

        expect(response.statusCode).toBe(503);
        expect(response.body).toEqual({
            success: false,
            message: 'Readiness check failed'
        });
    });

    test('GET /ready returns 503 when MySQL is unavailable', async () => {
        app.locals.startupComplete = true;
        jestApi.spyOn(sequelize, 'query').mockRejectedValue(
            new Error('MySQL unavailable')
        );

        const response = await request(app).get('/ready');

        expect(response.statusCode).toBe(503);
        expect(response.body).toEqual({
            success: false,
            message: 'Readiness check failed'
        });
    });

    test('GET /metrics returns Prometheus process metrics', async () => {
        await request(app).get('/live');
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
            /http_requests_total\{method="GET",status_code="200",path="\/live"[^}]*\} [1-9]\d*/
        );
        expect(response.text).toMatch(
            /http_request_duration_seconds_count\{method="GET",status_code="200",path="\/live"\} [1-9]\d*/
        );
    });
});
