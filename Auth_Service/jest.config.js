module.exports = {
    testEnvironment: 'node',
    maxWorkers: 2,

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
