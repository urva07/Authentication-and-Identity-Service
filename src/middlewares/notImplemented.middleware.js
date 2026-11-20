module.exports = (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Not implemented'
    });
};