const pino = require('pino');


const logger = pino(
    { 
        level: 'debug' 
    },
    (process.env.ENVIRONMENT || 'development') === 'development' ? pino.transport({
        target: 'pino-pretty',
        options: { 
            colorize: true,
            singleLine: true,
        }
    }) : undefined
);


module.exports = logger;