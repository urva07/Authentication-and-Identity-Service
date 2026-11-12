import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://127.0.0.1:3000';
const email = __ENV.SIGNIN_TEST_USER_EMAIL;
const password = __ENV.SIGNIN_TEST_USER_PASSWORD;
const name = __ENV.SIGNIN_TEST_USER_NAME;


export const options = {
    scenarios: {
        login: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '240s', target: 1 },
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
    if (!email || !password || !name) {
        throw new Error(
            'Set SIGNIN_TEST_USER_EMAIL, SIGNIN_TEST_USER_PASSWORD, and SIGNIN_TEST_USER_NAME to a dedicated test account.'
        );
    }
}

export default function () {
    const response = http.post(
        `${BASE_URL}/v1/auth/signin`,
        JSON.stringify({ email, password, name }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'auth_signin' }
        }
    );

    check(response, {
        'signin returns 200': (res) => res.status === 200,
        'signin returns the expected test user': (res) => {
            try {
                return res.json('data.user.email') === email;
            } catch {
                return false;
            }
        }
    });

    sleep(2);
}
