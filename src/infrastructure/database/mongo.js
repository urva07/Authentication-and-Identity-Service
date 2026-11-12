const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const config = require('../../config/config');

const connectMongoDB = async () => {
    const { host, port, database, username, password, authSource } =
        config.database.mongo;

    if (!host || !database || !username || password === undefined) {
        throw new Error(
            'MongoDB configuration is incomplete. Set MONGO_USERNAME, MONGO_PASSWORD, MONGO_HOST, and MONGO_DB_NAME.'
        );
    }

    await mongoose.connect(`mongodb://${host}:${port}`, {
        dbName: database,
        user: username,
        pass: password,
        authSource
    });
    logger.info('MongoDB connected');

};

module.exports = {
    connectMongoDB,
    mongoClient: mongoose.connection
};