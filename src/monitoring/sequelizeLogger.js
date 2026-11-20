const defaultLogger = require("#src/utils/logger.js");


const createSequelizeLogger = (dbQueryDuration) => {
    const createQueryLogger = (queryName, repositoryName, logger=defaultLogger) => {
        const logQuery = (sql, timing) => {
            logger.debug({ repositoryName, queryName }, `[Sequelize Query Logger] Executed SQL query with timing: ${ timing && timing / 1000 } seconds`);

            if (timing === undefined) return;
            
            dbQueryDuration.observe({ query_name: queryName, repository_name: repositoryName }, timing / 1000);
        }

        return logQuery;
    }

    return createQueryLogger;
}


module.exports = createSequelizeLogger;