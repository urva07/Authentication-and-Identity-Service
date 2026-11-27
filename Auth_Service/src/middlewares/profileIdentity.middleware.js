const { timingSafeEqual } = require('node:crypto');
const { z } = require('zod');
const config = require('#src/config/config/index.js');
const defaultLogger = require('#src/utils/logger.js');


const userIdSchema = z.uuid();

const secret = config.auth.ingress.sharedSecret;
if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    new Error('INGRESS_SHARED_SECRET must be configured with at least 32 bytes');
}

const profileIdentityMiddleware = (req, res, next) => {
    const logger = req.log || defaultLogger;
    const userId = req.headers['x-user-id'];
    const suppliedSecret = req.headers['x-ingress-auth-secret'];

    if (!userId || !userIdSchema.safeParse(userId).success || !suppliedSecret) {
        logger.warn("A major security breach has been encountered as request reached end service without ingress-auth-secret or valid useID bypassing the authentication layer of reverse proxy. If not then something is critically wrong in authentication layer or end service.")
        return next(new Error("Internal security breach"));
    }

    const expected = Buffer.from(secret);
    const supplied = Buffer.from(suppliedSecret);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
        logger.warn("A major security breach has been encountered as user request reached end service with invalid ingress-auth-secret may be bypassing the authentication of reverse proxy. If not then the service or reverse proxy must have been configured with wrong secrets.")
        return next(new Error("Internal security breach"));
    }
    
    req.user = { 
        id: userId 
    };
    return next();
};


module.exports = profileIdentityMiddleware;