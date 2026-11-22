require('dotenv').config();

module.exports = {
    apps: require('./apps'),
    email: require('./email'),
    redis: require('./redis'),
    queue: require('./queue'),
    worker: require('./worker'),
    shutdown: require('./shutdown')
};
