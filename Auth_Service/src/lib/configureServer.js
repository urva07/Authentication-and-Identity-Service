const config = require('#src/config/config/index.js');


const configureServer = (mainApp) => {
    if (!mainApp) {
        throw new Error("configureServer function must be provided with an instance of express app.")
    }
    mainApp.setTimeout(config.apps.mainApp.connectionInactivityTimeoutMs);
    mainApp.keepAliveTimeout = config.apps.mainApp.connectionKeepAliveTimeoutMs;
    mainApp.headersTimeout = config.apps.mainApp.reqHeadersTimeoutMs;
    mainApp.requestTimeout = config.apps.mainApp.reqTimeoutMs;
    mainApp.maxConnections = config.apps.mainApp.maxConnections;
}


module.exports = configureServer;