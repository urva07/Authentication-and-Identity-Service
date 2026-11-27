const logger = require('#src/utils/logger.js');
const { openSockets } = require('./openSockets.js');


const logNewSocketAndRegisterInflightReqs = (socket) => {
    logger.info(
        'New connection from ' +
            socket.remoteAddress +
            ':' +
            socket.remotePort
    );

    socket.inflightRequests = 0;
    openSockets.add(socket);
    socket.once('close', () => {
        logger.info(
            'Connection closed from ' +
                socket.remoteAddress +
                ':' +
                socket.remotePort
        );
        openSockets.delete(socket);
    });
}

const registerNewInflightReqToSocket = (req, res) => {
    const socket = req.socket;
    socket.inflightRequests += 1;

    res.once('close', () => {
        socket.inflightRequests -= 1;

        if (req.app.locals.shuttingDown && socket.inflightRequests === 0) {
            socket.destroy();
        }
    });
}


module.exports = { 
    logNewSocketAndRegisterInflightReqs,
    registerNewInflightReqToSocket
}