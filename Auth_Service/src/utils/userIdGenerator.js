const crypto = require('crypto');


function generateUniqueUserId() {
    // generate a random 16 byte random value and convert it to a hexadecimal string
    return crypto.randomBytes(16).toString('hex');
}

function generateUUID() {
    return crypto.randomUUID();
}


module.exports = {
    generateUniqueUserId,
    generateUUID
};