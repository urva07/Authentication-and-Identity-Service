const auth = require('./auth');
const identityProviders = require('./identityProviders');
const routes = require('./routes');
const redis = require('./redis');
const messages = require('./messages');
const passport = require('./passport');
const coalescing = require('./coalescing');
const validation = require('./validation');


module.exports = {
    ...auth,
    ...identityProviders,
    ...routes,
    ...redis,
    ...messages,
    ...passport,
    ...coalescing,
    ...validation
};
