const { createHash } = require('node:crypto');


const createSigninTokenKey = (tokenSecret) => {
    if (!tokenSecret || Buffer.byteLength(tokenSecret) < 32) {
        throw new Error('Sign-in token encryption requires a secret of at least 32 bytes');
    }

    return createHash('sha256')
        .update('first-shell-project:signin-verification:v1\0')
        .update(tokenSecret)
        .digest();
};


module.exports = { createSigninTokenKey };
