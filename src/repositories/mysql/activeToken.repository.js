const { Op, fn } = require('sequelize');

const createActiveTokenRepository = ({ ActiveToken, createQueryLogger }) => ({
    create: (attributes, options = {}) => ActiveToken.create(attributes, {
        benchmark: true,
        logging: createQueryLogger('create', 'ActiveToken'),
        ...options
    }),
    consume: ({ tokenType, jti, userId }, options = {}) => ActiveToken.destroy({
        benchmark: true,
        logging: createQueryLogger('consume', 'ActiveToken'),
        where: {
            tokenType,
            jti,
            userId,
            expiresAt: { [Op.gt]: fn('NOW') }
        },
        ...options
    })
});

module.exports = createActiveTokenRepository;
