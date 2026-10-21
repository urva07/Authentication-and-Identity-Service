const express = require('express');
const router = express.Router();
const passport = require('passport')

const notImplemented = (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Endpoint not implemented'
    });
};

router.get('/google', passport.authenticate('google'));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    // Successful authentication, redirect to the desired page or send a response
    res.redirect('/'); // Redirect to the home page or any other page
});

module.exports = router;