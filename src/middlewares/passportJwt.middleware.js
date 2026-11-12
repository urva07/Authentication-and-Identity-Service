const passport = require('passport');


const passportJwt = ({
    type,
    source,
    options
}) => {

    if (type === 'access' && source === 'header') {
        return passport.authenticate(
            'jwtAccessFromHeader', 
            { session: false, ...options }
        );
    }
    if (type === 'refresh' && source === 'cookie') {
        return passport.authenticate(
            'jwtRefreshFromCookie', 
            { session: false, ...options }
        );
    }

    throw new Error(`Unsupported passport JWT type: ${type} and source: ${source}`);
};


module.exports = passportJwt;