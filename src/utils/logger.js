const pino = require('pino');

const logger = pino(
    {},
    pino.transport({
        target: 'pino-pretty',
        options: { 
            colorize: true,
            singleLine: true,
        }
    })
);

module.exports = logger;
