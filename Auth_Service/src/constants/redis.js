const REDIS_CONSTANTS = Object.freeze({
    USER_LOCK_KEY_PREFIX: 'lock:user',
    USER_LOCK_TTL_SECONDS: 60,
    USER_CACHE_TTL_SECONDS: 300
});


module.exports = {
    REDIS_CONSTANTS
};
