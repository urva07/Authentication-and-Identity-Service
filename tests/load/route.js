import http from 'k6/http';
import { check, sleep } from 'k6';


const BASE_URL = (__ENV.K6_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const ROUTE = __ENV.K6_PATH || __ENV.K6_ROUTE;
const METHOD = (__ENV.K6_METHOD || 'POST').toUpperCase();
const payloadPath = ROUTE ? ROUTE.split('?')[0].replace(/[^a-zA-Z0-9]/g, '_') : '';
const payloadKey = `K6_METHOD_${METHOD}_PATH_${payloadPath}_PAYLOAD`;
const PAYLOAD_TEXT = __ENV.K6_PAYLOAD ?? __ENV[payloadKey];
const VUS = Number(__ENV.K6_VUS ?? 1);
const DURATION = __ENV.K6_DURATION || '60s';
const EXPECTED_STATUS = Number(__ENV.K6_EXPECTED_STATUS ?? 200);
const ALLOWED_METHODS = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'];
const MAX_VUS = 20;
const MAX_DURATION_SECONDS = 600;

let payload = null;
if (PAYLOAD_TEXT) {
    try {
        payload = JSON.parse(PAYLOAD_TEXT);
    } catch {
        throw new Error(`${__ENV.K6_PAYLOAD !== undefined ? 'K6_PAYLOAD' : payloadKey} must be a valid JSON value.`);
    }
}


export const options = {
    scenarios: {
        route: {
            executor: 'constant-vus',
            vus: VUS,
            duration: DURATION
        }
    },
    thresholds: {
        checks: ['rate>0.99'],
        http_req_duration: ['p(95)<1000']
    }
};

export function setup() {
    if (!ROUTE) {
        throw new Error('Set K6_PATH to the path of the route to test, such as /v1/auth/login.');
    }
    if (!ROUTE.startsWith('/') || ROUTE.startsWith('//')) {
        throw new Error('K6_PATH must be a relative path starting with one slash.');
    }
    if (!ALLOWED_METHODS.includes(METHOD)) {
        throw new Error(`K6_METHOD must be one of: ${ALLOWED_METHODS.join(', ')}.`);
    }
    if (!Number.isInteger(VUS) || VUS < 1 || VUS > MAX_VUS) {
        throw new Error(`K6_VUS must be an integer between 1 and ${MAX_VUS}.`);
    }
    const durationUnit = DURATION.slice(-1);
    const durationValue = Number(DURATION.slice(0, -1));
    const durationSeconds = durationUnit === 'm'
        ? durationValue * 60
        : durationUnit === 's' ? durationValue : NaN;
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_DURATION_SECONDS) {
        throw new Error('K6_DURATION must be a positive duration of up to 10 minutes, specified in seconds or minutes.');
    }
    if (!Number.isInteger(EXPECTED_STATUS) || EXPECTED_STATUS < 100 || EXPECTED_STATUS > 599) {
        throw new Error('K6_EXPECTED_STATUS must be an HTTP status code between 100 and 599.');
    }
}

export default function () {
    const requestUrl = `${BASE_URL}${ROUTE}`;
    const requestBody = PAYLOAD_TEXT ? JSON.stringify(payload) : null;
    const params = {
        headers: requestBody === null ? {} : { 'Content-Type': 'application/json' },
        tags: { name: 'route_test' }
    };
    const response = http.request(METHOD, requestUrl, requestBody, params);

    check(response, {
        [`route returns ${EXPECTED_STATUS}`]: (res) => res.status === EXPECTED_STATUS
    });

    sleep(2);
}
