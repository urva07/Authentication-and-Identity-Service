const retryWithExponentialBackoff = async (operation, maxRetries = 3, initialDelay = 100) => {
    let attempt = 0;
    let delay = initialDelay;

    while (attempt < maxRetries) {
        try {
            return await operation();
        } catch (error) {
            attempt++;
            if (attempt >= maxRetries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
};


module.exports = retryWithExponentialBackoff;