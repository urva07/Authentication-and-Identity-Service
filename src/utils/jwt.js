const jwt = require("jsonwebtoken");
const config = require('#src/config/config/index.js');
const { generateUUID } = require('./userIdGenerator.js');


const generateJWTtoken = ({ 
    payload, 
    expiry, 
    secret
}) => {
    return jwt.sign(
        {
            jti: generateUUID(),
            ...payload
        },
        secret,
        { 
            expiresIn: expiry 
        }
    );
};

const verifyJWTtoken = ({ 
    token, 
    secret 
}) => {
    return jwt.verify(token, secret);
};

const generateAccessToken = (userId) => {
    return generateJWTtoken({
        payload: { 
            sub: String(userId) 
        },
        expiry: config.auth.jwt.jwtAccessTokenExpiration,
        secret: config.auth.jwt.jwtAccessTokenSecret
    });
};

const generateRefreshToken = (userId) => {
    return generateJWTtoken({
        payload: { 
            sub: String(userId) 
        },
        expiry: config.auth.jwt.jwtRefreshTokenExpiration,
        secret: config.auth.jwt.jwtRefreshTokenSecret
    });
};

const generatePasswordResetToken = ({
    userId, 
    email, 
    purpose 
}) => {
    return generateJWTtoken({
        payload: { 
            sub: String(userId),
            email,
            purpose
        },
        expiry: config.auth.jwt.jwtPasswordResetTokenTtlSeconds,
        secret: config.auth.jwt.jwtPasswordResetTokenSecret
    });
};


module.exports = {
    generateJWTtoken,
    verifyJWTtoken,
    generateAccessToken,
    generateRefreshToken,
    generatePasswordResetToken
};