const jwt = require("jsonwebtoken");

const generateJWTtoken = ({ 
    payload, 
    expiry, 
    secret
}) => {
    return jwt.sign(payload, secret, {
        expiresIn: expiry,
    });
};

const verifyJWTtoken = ({ 
    token, 
    secret 
}) => {
    return jwt.verify(token, secret);
};

module.exports = {
    generateJWTtoken,
    verifyJWTtoken,
};