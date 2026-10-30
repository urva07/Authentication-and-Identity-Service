const bcrypt = require('bcrypt');

const hashPassword = async (password, saltRounds = 10) => {
    return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);;
};

module.exports = { hashPassword, verifyPassword };