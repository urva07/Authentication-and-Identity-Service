const createUserRepository = (User) => ({
    create: (attributes, options = {}) => User.create(attributes, options),
    findById: (id, options = {}) => User.findByPk(id, options),
    findByEmail: (email, options = {}) => User.findOne({ where: { email }, ...options }),
    findByPhone: (phone, options = {}) => User.findOne({ where: { phone }, ...options }),
    updateById: (id, attributes, options = {}) =>
        User.update(attributes, {
            where: { id },
            ...options
        }),
    deleteById: (id, options = {}) =>
        User.destroy({
            where: { id },
            ...options
        })
});

module.exports = createUserRepository;
