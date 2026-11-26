const openSockets = new Set();

const destroyIdleSockets = () => {
    for (const socket of openSockets) {
        if (socket.inflightRequests === 0) {
            socket.destroy();
        }
    }
};


module.exports = { destroyIdleSockets, openSockets };