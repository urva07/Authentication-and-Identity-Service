const { timingSafeEqual } = require('node:crypto');
const { z } = require('zod');
const config = require('#src/config/config/index.js');
const { AuthenticationError } = require('#src/errors/index.js');


const userIdSchema = z.uuid();

const profileIdentityMiddleware = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const suppliedSecret = req.headers['x-ingress-auth-secret'];

    if (typeof suppliedSecret !== 'string' || typeof userId !== 'string') {
        return next(new AuthenticationError());
    }
    
    const secret = config.auth.ingress.sharedSecret;
    if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
        return next(new Error('INGRESS_SHARED_SECRET must be configured with at least 32 bytes'));
    }

    const expected = Buffer.from(secret);
    const supplied = Buffer.from(suppliedSecret);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied) || !userIdSchema.safeParse(userId).success) {
        return next(new AuthenticationError());
    }
    
    req.user = { 
        id: userId 
    };
    return next();
};


module.exports = profileIdentityMiddleware;