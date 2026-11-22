const LocalStrategy = require('passport-local').Strategy;
const { mysql: { getUserRepository } } = require('#src/repositories/index.js');
const { verifyPassword } = require('#src/utils/hashPasswordAndVerify.js');
const { AuthenticationError } = require('#src/errors/index.js');
const logger = require('#src/utils/logger.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const { createCoalescingKey } = require('#src/lib/index.js');
const { COALESCING } = require('#src/constants/index.js');


const createBasicAuthenticationCallback = ({
    userRepository
} = {}) => {

    const coalescingKey = createCoalescingKey({
        db: COALESCING.DATABASES.MYSQL,
        repository: COALESCING.MYSQL.REPOSITORIES.USER,
        method: COALESCING.MYSQL.METHODS.USER.FIND_BY_EMAIL_WITH_PASSWORD
    });

    return async (email, password, done) => {
        logger.debug('Basic authentication attempt started');
        try {
            userRepository =  userRepository || getUserRepository();
            const user = await requestCoalescer(
                coalescingKey([email]),
                () => userRepository.findByEmailWithPassword(email),
                logger
            );

            if (!user) {
                logger.debug('Basic authentication failed: user not found');
                return done(new AuthenticationError('Invalid Username or Password'));
            }

            const hashedPassword = user.password?.passwordHash ?? user.password;
            if (!hashedPassword) {
                logger.debug('Basic authentication failed: stored password hash unavailable');
                return done(new AuthenticationError('Invalid Username or Password'));
            }

            const isPasswordValid = await verifyPassword(password, hashedPassword);
            if (!isPasswordValid) {
                logger.debug('Basic authentication failed: invalid password');
                return done(new AuthenticationError('Invalid Username or Password'));
            }

            logger.debug('Basic authentication succeeded');
            return done(null, user);
        } catch (error) {
            logger.debug('Basic authentication failed with an unexpected error');
            return done(error);
        }
    };
};

const basicStrategy = new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    createBasicAuthenticationCallback()
);


module.exports = {
    basicStrategy,
    createBasicAuthenticationCallback
}