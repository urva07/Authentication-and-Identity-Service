module.exports = {
    frontend: {
        baseUrl: process.env.FRONTEND_BASE_URL || `http://localhost:${Number(process.env.PORT) || 3000}`
    }
}