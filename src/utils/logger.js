const pino = require('pino');
const config = require('../config/config');


const logger = pino(
    { 
        level: 'debug' 
    },
    config.apps.environment === 'development' ? pino.transport({
        target: 'pino-pretty',
        options: { 
            colorize: true,
            singleLine: true,
        }
    }) : undefined
);


module.exports = logger;
