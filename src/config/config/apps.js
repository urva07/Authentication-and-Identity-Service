module.exports = {
    mainApp: {
        environment: process.env.environment || 'development',
        domain: process.env.DOMAIN || 'localhost',
        port: Number(process.env.PORT) || 3000,
        apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,
        corsOrigin: process.env.CORS_ORIGIN,
        externalApiTimeoutMs: Number(process.env.EXTERNAL_API_TIMEOUT_MS) || 15000,
        totalReqResCycleTimeOutMs: Number(process.env.TOTAL_REQ_RES_CYCLE_TIMEOUT_MS) || 15000,
        connectionKeepAliveTimeoutMs: Number(process.env.CONNECTION_KEEP_ALIVE_TIMEOUT_MS) || 20000,
        connectionInactivityTimeoutMs: Number(process.env.CONNECTION_INACTIVITY_TIMEOUT_MS) || 10000,
        reqHeadersTimeoutMs: Number(process.env.REQ_HEADERS_TIMEOUT_MS) || 5000,
        reqTimeoutMs: Number(process.env.REQ_TIMEOUT_MS) || 20000,
        maxConnections: Number(process.env.MAX_CONNECTIONS) || 1000,
        bodySizeLimit: process.env.BODY_SIZE_LIMIT || '10kb'
    },
    healthApp: {
        port: Number(process.env.HEALTH_APP_PORT) || 3001
    }
}