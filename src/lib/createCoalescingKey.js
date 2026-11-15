const stableStringify = require("fast-json-stable-stringify");


const allowedRedisInstances = ['userCache'];
const allowedDbs = ['redis', 'mongodb', 'mysql'];

function createCoalescingKey({db, redisInstance, repository, method}) {
    if (!db || !repository || !method) {
        throw new Error('All parameters (db, repository, method) are required.');
    }
    if (typeof db !== 'string' || typeof repository !== 'string' || typeof method !== 'string') {
        throw new Error('Invalid parameter types. Expected db, repository, and method to be strings.');
    }

    const normalizedDb = db.toLowerCase();
    if (!allowedDbs.includes(normalizedDb)) {
        throw new Error(`Invalid db. Allowed dbs are: ${allowedDbs.join(', ')}`);
    }
    if (normalizedDb === 'redis' && !allowedRedisInstances.includes(redisInstance)) {
        throw new Error(`Invalid redisInstance. Allowed instances are: ${allowedRedisInstances.join(', ')}`);
    }

    const prefix = normalizedDb === 'redis' ? `redis:${redisInstance}` : normalizedDb;
    const keyPrefix = `${prefix}:${repository.toLowerCase()}:${method.toLowerCase()}`;
    
    return function (args) {
        if (!Array.isArray(args)) {
            throw new Error('Invalid args. Expected an array.');
        }
        if (args.some(arg => typeof arg === 'undefined')) {
            throw new Error('All elements in args array must be defined.');
        }
        return `${keyPrefix}:${stableStringify(args)}`;
    };
}


module.exports = createCoalescingKey;