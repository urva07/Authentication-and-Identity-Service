const createUserPasswordRepository = (UserPassword) => ({
    create: (attributes, options = {}) => UserPassword.create(attributes, options),
    findByUserId: (userId, options = {}) =>
        UserPassword.findOne({
            where: { userId },
            ...options
        }),
    updateByUserId: (userId, attributes, options = {}) =>
        UserPassword.update(attributes, {
            where: { userId },
            ...options
        }),
    deleteByUserId: (userId, options = {}) =>
        UserPassword.destroy({
            where: { userId },
            ...options
        })
});

module.exports = createUserPasswordRepository;
