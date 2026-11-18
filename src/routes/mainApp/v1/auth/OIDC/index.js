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


const googleCallbackController = controllers['google-callback.controller']();

router.get('/google', passport.authenticate('google'));

router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login' }),
    googleCallbackController.get
);


module.exports = router;