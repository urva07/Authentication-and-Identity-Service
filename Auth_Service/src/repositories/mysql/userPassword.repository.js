const createUserPasswordRepository = ({ 
    UserPassword, 
    createQueryLogger 
}) => ({
    create: (
        attributes, 
        options = {}
    ) => UserPassword.create(attributes, {
        benchmark: true,
        logging: createQueryLogger('create', 'UserPassword'),
        ...options
    }),
    findByUserId: (
        userId, 
        options = {}
    ) => UserPassword.findOne({
        benchmark: true,
        logging: createQueryLogger('findByUserId', 'UserPassword'),
        where: { userId },
        ...options
    }),
    updateByUserId: (
        userId, 
        attributes, 
        options = {}
    ) => UserPassword.update(attributes, {
        benchmark: true,
        logging: createQueryLogger('updateByUserId', 'UserPassword'),
        where: { userId },
        ...options
    }),
    deleteByUserId: (
        userId, 
        options = {}
    ) => UserPassword.destroy({
        benchmark: true,
        logging: createQueryLogger('deleteByUserId', 'UserPassword'),
        where: { userId },
        ...options
    })
});


module.exports = createUserPasswordRepository;
