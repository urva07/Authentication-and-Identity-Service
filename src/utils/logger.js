const pino = require('pino');
const config = require('#src/config/config.js');


const logger = pino(
    { 
        level: 'debug' 
    },
    config.app.environment === 'development' ? pino.transport({
        target: 'pino-pretty',
        options: { 
            colorize: true,
            singleLine: true,
        }
    }) : undefined
);


module.exports = logger;
