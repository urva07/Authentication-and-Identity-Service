const mailQueue = require('./mailQueue');
const mailProducer = require('./mailProducer');


module.exports = {
    ...mailQueue,
    ...mailProducer
};
