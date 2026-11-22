const CircuitBreaker = require('opossum');

const circuitBreakerOptions = {
    timeout: 5000, // If our function takes longer than 5 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 10000 // After 10 seconds, try again.
};

module.exports = {
    CircuitBreaker,
    circuitBreakerOptions
};