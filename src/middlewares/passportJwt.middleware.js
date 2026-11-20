const passport = require('passport');
const { AUTH_TOKENS, PASSPORT_STRATEGIES } = require('#src/constants/index.js');


const passportJwt = ({
    type,
    source,
    options
}) => {

    if (type === AUTH_TOKENS.ACCESS && source === 'header') {
        return passport.authenticate(
            PASSPORT_STRATEGIES.JWT_ACCESS_HEADER,
            { session: false, ...options }
        );
    }
    if (type === AUTH_TOKENS.REFRESH && source === 'cookie') {
        return passport.authenticate(
            PASSPORT_STRATEGIES.JWT_REFRESH_COOKIE,
            { session: false, ...options }
        );
    }

    throw new Error(`Unsupported passport JWT type: ${type} and source: ${source}`);
};


module.exports = passportJwt;