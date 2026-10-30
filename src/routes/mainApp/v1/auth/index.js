const express = require('express');
const validators = require('#src/validators/index.js');
const { "mainApp.versions": { v1: { "auth.controllers": controllers } } } = require('#src/controllers/index.js');
const middlewares = require('#src/middlewares/index.js');
const { "mainApp.services": { "auth.services": services } }= require('#src/services/index.js');
const oidcRouter = require('./OIDC');
const passport = require('passport');


const notImplemented = (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Endpoint not implemented'
    });
};

const router = express.Router();

const loginController = controllers['login.controller'](
    services['login.service']()
);
const signinController = controllers['signin.controller'](
    services['signin.service']()
);
const verifyController = controllers['verify.controller'](
    services['verify.service']()
);
const verifyEmailController = controllers['verify-email.controller'](
    services['verify-email.service']()
);
const refreshController = controllers['refresh.controller'](
    services['refresh.service']()
);
const logoutController = controllers['logout.controller'](
    services['logout.service']()
);

router.post(
    '/verify',
    middlewares['passportJWTAccessFromHeader.middleware'], 
    validators['verify.validator'].post, 
    verifyController.post
);
router.post(
    '/login', 
    validators['login.validator'].post, 
    loginController.post
);
router.post(
    '/signin', 
    validators['signin.validator'].post,
    signinController.post
);
router.post(
    '/refresh', 
    middlewares['auth.middleware']('cookie', 'refresh'), 
    validators['refresh.validator'].post, 
    refreshController.post
);
router.post(
    '/logout', 
    logoutController.post
);
router.post(
    '/forgot-password', 
    notImplemented
);
router.post(
    '/change-password', 
    notImplemented
);
router.get(
    '/csrf', 
    validators['csrf.validator'].get, 
    notImplemented
);
router.get(
    '/verify-email',
    validators['verify-email.validator'].get,
    verifyEmailController.get
);
router.use('/oidc', oidcRouter);


module.exports = router;
