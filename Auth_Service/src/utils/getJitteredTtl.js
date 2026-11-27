const crypto = require('node:crypto');


const jitteredTtl = (baseTtl, jitter = 10) => {
    if (!Number.isFinite(baseTtl) || baseTtl < 1) {
        throw new TypeError('Base TTL must be a positive number');
    }
    if (!Number.isFinite(jitter) || jitter < 0 || jitter > 100) {
        throw new TypeError('TTL jitter must be between 0 and 100');
    }

    const jitterAmount = Math.floor(baseTtl * (jitter / 100));
    if (jitterAmount === 0) {
        return Math.floor(baseTtl);
    }

    const offset = crypto.randomInt(
        -jitterAmount,
        jitterAmount + 1
    );

    return Math.max(1, Math.floor(baseTtl) + offset);
};


module.exports = jitteredTtl;