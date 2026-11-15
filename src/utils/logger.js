const pino = require('pino');
const config = require('#src/config/config/index.js');


const logger = pino(
    { 
        level: 'debug' 
    },
    config.apps.mainApp.environment === 'development' ? pino.transport({
        target: 'pino-pretty',
        options: { 
            colorize: true,
            singleLine: true,
        }
    }) : undefined
);


module.exports = logger;
