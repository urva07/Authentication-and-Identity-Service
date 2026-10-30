module.exports = (req, res, next) => {
    req.app.locals.requestCount = (req.app.locals.requestCount || 0) + 1;

    let decremented = false;

    function decrementOnce() {
        if (decremented) return;

        decremented = true;
        req.app.locals.requestCount = (req.app.locals.requestCount || 0) - 1;
    }

    function destroySocketOnce() {
        if (req.socket.destroyed) return;

        req.socket.destroy();
    }
        
    req.once('close', () => {
        if (!req.complete) {
            decrementOnce();
        }
    });

    res.once('finish', () => {
        decrementOnce();
        if (req.app.locals.shuttingDown) {
            destroySocketOnce();
        }
    });

    res.once('close', () => {
        decrementOnce();
        if (req.app.locals.shuttingDown) {
            destroySocketOnce();
        }
    });

    next();
}