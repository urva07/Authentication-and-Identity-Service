const express = require('express');
const validators = require('../../../validators');
const controllers = require('../../../controllers/v1');
const { ["auth.middleware"]: authMiddleware } = require('../../../middlewares');
const services = require('../../../services');
const oidcRouter = require('./OIDC');

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
const refreshController = controllers['refresh.controller'](
    services['refresh.service']()
);
const logoutController = controllers['logout.controller'](
    services['logout.service']()
);

router.post(
    '/verify', 
    authMiddleware('authorization'), 
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
    authMiddleware('cookie'), 
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
    notImplemented
); 

router.use('/oidc', oidcRouter);


module.exports = router;
