module.exports = {
    testEnvironment: 'node',

    setupFilesAfterEnv: [
        '<rootDir>/tests/setup.js'
    ],

    coverageDirectory: 'coverage',

    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/index.js'
    ],

    testMatch: [
        '**/tests/**/*.test.js'
    ]
};
