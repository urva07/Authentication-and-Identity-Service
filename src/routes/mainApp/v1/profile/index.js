const express = require('express');
const validators = require('#src/validators/index.js');
const {
    "mainApp.versions": {
        v1: {
            "profile.controllers": controllers
        }
    }
} = require('#src/controllers/index.js');
const { 
    "mainApp.services": { 
        "profile.services": services 
    } 
} = require('#src/services/index.js');
const profileIdentityMiddleware = require('#src/middlewares/profileIdentity.middleware.js');


const router = express.Router();

const profileService = services['profile.service']();
const meController = controllers['me.controller'](profileService);
const profileByIdController = controllers['profile-by-id.controller'](profileService);

router.get(
    '/me',
    profileIdentityMiddleware,
    meController.get
);
router.patch(
    '/me',
    profileIdentityMiddleware,
    validators['profile.validator'].patch,
    meController.patch
);
router.delete(
    '/me',
    profileIdentityMiddleware,
    meController.delete
);
router.get(
    '/:id',
    profileIdentityMiddleware,
    validators['profile.validator'].get,
    profileByIdController.get
);


module.exports = router;
