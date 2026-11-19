const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
    "mainApp.versions": {
        v1: {
            "auth.controllers": {
                "oidc.controllers": controllers
            }
        }
    }
} = require('#src/controllers/index.js');
const {
    "mainApp.services": {
        "auth.services": services
    }
} = require('#src/services/index.js');


const googleCallbackService = services['oidc.services']['google-callback.service'](
    services['passport-login.service']()
);
const googleCallbackController = controllers['google-callback.controller'](
    googleCallbackService
);

router.get('/google', passport.authenticate('google'));

router.get(
    '/google/callback',
    passport.authenticate('google', { 
        failureRedirect: 'http://localhost:3000/login',
        session: false
    }),
    googleCallbackController.get
);


module.exports = router;