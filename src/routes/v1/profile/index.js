const express = require('express');
const { ["auth.middleware"]: authMiddleware } = require('../../../middlewares');

const router = express.Router();

const notImplemented = (req, res) =>
    res.status(501).json({
        success: false,
        message: 'Endpoint not implemented'
    });

router.use(authMiddleware('authorization'));

router.get(
    '/me', 
    notImplemented
);
router.patch(
    '/me', 
    notImplemented
);
router.get(
    '/:id', 
    notImplemented
);

module.exports = router;
