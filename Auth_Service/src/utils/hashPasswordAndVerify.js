const bcrypt = require('bcrypt');
const config = require('#src/config/config/index.js');


const hashPassword = async (password, saltRounds = config.auth.basic.hashSaltRounds) => {
    return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);;
};


module.exports = { 
    hashPassword, 
    verifyPassword 
};