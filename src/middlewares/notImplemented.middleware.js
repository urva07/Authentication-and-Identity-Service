module.exports = (req, res, next) => {
    res.status(501).json({
        success: false,
        message: 'Not implemented'
    });
};