import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://127.0.0.1:3000';
const email = __ENV.LOGIN_TEST_USER_EMAIL;
const password = __ENV.LOGIN_TEST_USER_PASSWORD;

export const options = {
    scenarios: {
        login: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '120s', target: 1 },
                // { duration: '3s', target: 20 },
                // { duration: '5s', target: 10 }
            ]
        }
    },
    thresholds: {
        checks: ['rate>0.99'],
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.01']
    }
};

export function setup() {
    if (!email || !password) {
        throw new Error(
            'Set LOGIN_TEST_USER_EMAIL and LOGIN_TEST_USER_PASSWORD to a dedicated test account.'
        );
    }
}

export default function () {
    const response = http.post(
        `${BASE_URL}/v1/auth/login`,
        JSON.stringify({ email, password }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'auth_login' }
        }
    );

    check(response, {
        'login returns 200': (res) => res.status === 200,
        'login returns the expected test user': (res) => {
            try {
                return res.json('data.user.email') === email;
            } catch {
                return false;
            }
        }
    });

    sleep(2);
}
