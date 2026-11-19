const defaultLogger = require('#src/utils/logger.js');
const { generateUUID } = require('#src/utils/userIdGenerator.js');
const retryWithExponentialBackoff = require('./retryWithExponentialBackoff');


const cacheAuthenticatedUser = async ({ userExistenceRepository, userLockRepository }, userId, logger=defaultLogger) => {
    const token = generateUUID();

    try {
        if (!await userLockRepository.acquire(userId, token)) {
            logger.debug({ userId }, 'Skipping user existence cache on authentication as user is locked to cache');
            return;
        }
    } catch (error) {
        logger.error({ userId, err: error }, 'Failed to check user lock; skipping cache');
        return;
    }

    try {
        logger.debug({ userId }, 'Caching user existence on authentication');
        await userExistenceRepository.setById(userId);
        logger.debug({ userId }, 'User existence successfully cached on authentication');
    } catch (error) {
        logger.error({ userId, err: error }, 'Failed to cache user existence on authentication');
    } finally {
        const releaseLock = async () => {
            await userLockRepository.release(userId, token);
            logger.debug({ userId }, 'Lock released on user');
        };

        try {
            await retryWithExponentialBackoff(releaseLock, 5);
        } catch (error) {
            logger.error({ userId, err: error }, 'Failed to release user lock');
        }
    }
}


module.exports = cacheAuthenticatedUser