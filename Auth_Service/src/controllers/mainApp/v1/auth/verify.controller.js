const createVerifyController = (verifyService) => ({
    post: async (req, res, next) => {
        try {
            const user = await verifyService.verifyUser(req.user, req.log);
            res.header('x-user-id', user.id);
            // res.header('x-user-email', user.email);
            // res.header('x-user-name', user.firstName + ' ' + user.lastName);
            return res.status(200).send();
        } catch (error) {
            return next(error);
        }
    }
});

module.exports = createVerifyController;
