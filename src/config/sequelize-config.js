require('dotenv').config();

const config = require('./config');

const mysqlConfig = {
    username: config.database.mysql.username,
    password: config.database.mysql.password,
    database: config.database.mysql.database,
    host: config.database.mysql.host,
    port: config.database.mysql.port,
    dialect: 'mysql',
    seederStorage: 'sequelize',
    seederStorageTableName: 'SequelizeData'
};

module.exports = {
    development: mysqlConfig,
    test: mysqlConfig,
    production: mysqlConfig
};
