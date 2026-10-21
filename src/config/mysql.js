const { Sequelize } = require('sequelize');
const initializeModels = require('../models');
const logger = require('../utils/logger');
const config = require('./config');

const connectMySQL = async () => {
    const { username, password, host, port, database } = config.database.mysql;

    if (!username || password === undefined || !host || !database) {
        throw new Error(
            'MySQL configuration is incomplete. Set MYSQL_USER, MYSQL_PASSWORD, MYSQL_HOST, and MYSQL_DATABASE.'
        );
    }

    const sequelize = new Sequelize(database, username, password, {
        host,
        port,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });

    initializeModels(sequelize);
    await sequelize.authenticate();

    logger.info('MySQL connected');
    return sequelize;
};

module.exports = connectMySQL;