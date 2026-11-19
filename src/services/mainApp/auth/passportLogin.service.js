const { generateRefreshToken, generateAccessToken } = require('#src/utils/jwt.js');
const { AuthenticationError } = require('#src/errors/index.js');
const defaultLogger = require('#src/utils/logger.js');
const { cacheAuthenticatedUser } = require('#src/lib/index.js');
const {
    redis: {
        userCacheInstance: {
            getUserExistenceRepository
        },
        sessionInstance: {
            getUserLockRepository
        }
    }
} = require('#src/repositories/index.js');

const INVALID_CREDENTIALS = 'Invalid Username or Password';

const createPassportLoginService = ({
    userExistenceRepository,
    userLockRepository
} = {}) => {

    const loginUser = async (user, logger = defaultLogger) => {
        if (!user) {
            logger.debug('Did not receive user from passport basic strategy. The passport basic strategy\'s verify callback is supposed to throw an error if authentication fails. Please check the strategy implementation.');
            throw new AuthenticationError(INVALID_CREDENTIALS);
        }

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);
        logger.debug('Login tokens generated', { userId: String(user.id) });

        userExistenceRepository = userExistenceRepository || getUserExistenceRepository();
        userLockRepository = userLockRepository || getUserLockRepository();
        
        await cacheAuthenticatedUser(
            {
                userExistenceRepository,
                userLockRepository
            },
            user.id,
            logger
        )

        return {
            accessToken,
            refreshToken,
            user: {
                id: String(user.id),
                email: user.email,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePhoto: user.profilePhoto,
                profileCompleted: user.profileCompleted
            }
        };
    }

    return {
        loginUser
    };
}


module.exports = createPassportLoginService;