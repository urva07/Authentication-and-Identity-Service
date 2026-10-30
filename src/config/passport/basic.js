const LocalStrategy = require('passport-local').Strategy;
const { getUserRepository } = require('#src/repositories/index.js');
const { verifyPassword } = require('#src/utils/hashPasswordAndVerify.js');
const { AuthenticationError } = require('#src/errors/index.js');
const logger = require('#src/utils/logger.js');

const basicStrategy = new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    }, 
    async (email, password, done) => {
        logger.debug('Basic authentication attempt started');
        try {
            const userRepository = getUserRepository();
            const user = await userRepository.findByEmailWithPassword(email);

            if (!user) {
                logger.debug('Basic authentication failed: user not found');
                return done(new AuthenticationError('User not found'));
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

    }
)

module.exports = {
    basicStrategy
}