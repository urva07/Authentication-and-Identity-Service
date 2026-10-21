const createLogoutService = () => ({
    logoutUser: () => ({ loggedOut: true })
});

module.exports = createLogoutService;
