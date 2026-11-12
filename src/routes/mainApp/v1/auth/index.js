const express = require('express');
const validators = require('#src/validators/index.js');
const { 
    "mainApp.versions": { 
        v1: { 
            "auth.controllers": controllers 
        } 
    } 
} = require('#src/controllers/index.js');
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
    services['passport-login.service']()
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
const forgotPasswordController = controllers['forgot-password.controller'](
    services['forgot-password.service']()
);
const changePasswordController = controllers['change-password.controller'](
    services['change-password.service']()
);

router.post(
    '/verify',
    validators['verify.validator'].post, 
    middlewares['passportJwt.middleware']({ type: 'access', source: 'header' }), 
    verifyController.post
);
router.post(
    '/login', 
    validators['login.validator'].post, 
    passport.authenticate('basic', { session: false }),
    loginController.post
);
router.post(
    '/signin', 
    validators['signin.validator'].post,
    signinController.post
);
router.post(
    '/refresh', 
    validators['refresh.validator'].post, 
    middlewares['passportJwt.middleware']({ type: 'refresh', source: 'cookie' }), 
    refreshController.post
);
router.post(
    '/logout', 
    logoutController.post
);
router.post(
    '/forgot-password', 
    validators['forgot-password.validator'].post,
    forgotPasswordController.post
);
router.post(
    '/change-password', 
    validators['change-password.validator'].post,
    changePasswordController.post
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