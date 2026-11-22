const { Sequelize } = require('sequelize');
const initializeModels = require('#src/models/index.js');
const logger = require('#src/utils/logger.js');
const config = require('#src/config/config/index.js');

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
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        underscored: true
    }
});

const models = initializeModels(sequelize);

const connectMySQL = async () => {
    await sequelize.authenticate();

    logger.info('MySQL connected');
};

module.exports = { 
    connectMySQL,
    sequelize,
    models
};