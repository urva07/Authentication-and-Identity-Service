const createUserRepository = ({
    User, 
    UserPassword, 
    createQueryLogger 
}) => ({
    create: (
        attributes, 
        options = {}
    ) => User.create(
        attributes, 
        { 
            benchmark: true, 
            logging: createQueryLogger('create', 'User'), 
            ...options 
        }
    ),
    findById: (
        id, 
        options = {}
    ) => User.findByPk(
        id, 
        { 
            benchmark: true, 
            logging: createQueryLogger('findById', 'User'), 
            ...options 
        }
    ),
    createButIgnoreIfExists: (
        attributes, 
        options = {}
    ) => User.create(
        attributes,
        {
            ignoreDuplicates: true,
            benchmark: true,
            logging: createQueryLogger('createButIgnoreIfExists', 'User'),
            ...options
        }
    ),
    findByEmailOrCreate: (
        email, 
        defaults, 
        options = {}
    ) => User.findOrCreate({
        benchmark: true,
        logging: createQueryLogger('findByEmailOrCreate', 'User'),
        where: { email },
        defaults,
        ...options
    }),
    findByEmail: (
        email, 
        options = {}
    ) => User.findOne({ 
        benchmark: true, 
        logging: createQueryLogger('findByEmail', 'User'), 
        where: { email }, 
        ...options 
    }),
    findByEmailWithPassword: (
        email, 
        options = {}
    ) => User.findOne({ 
        benchmark: true, 
        logging: createQueryLogger('findByEmailWithPassword', 'User'),
        where: { 
            email 
        }, 
        include: [{ 
            model: UserPassword, 
            required: true, 
            attributes: ['passwordHash'],
            as: 'password', 
        }], 
        ...options 
    }),
    updateById: (
        id, 
        attributes, 
        options = {}
    ) => User.update(attributes, {
        benchmark: true,
        logging: createQueryLogger('updateById', 'User'),
        where: { id },
        ...options
    }),
    deleteById: (
        id, 
        options = {}
    ) => User.destroy({
        benchmark: true,
        logging: createQueryLogger('deleteById', 'User'),
        where: { id },
        ...options
    })
});


module.exports = createUserRepository;
