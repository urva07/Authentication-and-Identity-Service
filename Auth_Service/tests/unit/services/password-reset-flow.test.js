const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const config = require('../../../src/config/config');
const createForgotPasswordService = require('../../../src/services/mainApp/auth/forgotPassword.service');
const createChangePasswordService = require('../../../src/services/mainApp/auth/changePassword.service');

describe('password reset flow', () => {
    test('an emailed token can change the password once', async () => {
        const originalSecret = config.auth.jwt.jwtPasswordResetTokenSecret;
        const originalTtl = config.auth.jwt.jwtPasswordResetTokenTtlSeconds;
        const originalBaseUrl = config.apps.mainApp.apiBaseUrl;
        const originalSaltRounds = config.auth.basic.hashSaltRounds;
        config.auth.jwt.jwtPasswordResetTokenSecret = 'a'.repeat(64);
        config.auth.jwt.jwtPasswordResetTokenTtlSeconds = 900;
        config.apps.mainApp.apiBaseUrl = 'https://api.example.com';
        config.auth.basic.hashSaltRounds = 4;

        try {
            const user = { id: 'user-1', email: 'ada@example.com' };
            const userRepository = {
                findByEmail: jestApi.fn().mockResolvedValue(user),
                findById: jestApi.fn().mockResolvedValue(user)
            };
            let activeToken;
            const activeTokenRepository = {
                create: jestApi.fn(async (attributes) => { activeToken = attributes; }),
                consume: jestApi.fn(async ({ tokenType, jti, userId }) => {
                    if (!activeToken || activeToken.tokenType !== tokenType ||
                        activeToken.jti !== jti || activeToken.userId !== userId) {
                        return 0;
                    }
                    activeToken = undefined;
                    return 1;
                })
            };
            const emailService = { sendEmail: jestApi.fn().mockResolvedValue({}) };
            const userPasswordRepository = {
                updateByUserId: jestApi.fn().mockResolvedValue([1])
            };
            const mysqlSequelizeClient = {
                transaction: jestApi.fn((callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }))
            };
            const forgot = createForgotPasswordService({
                userRepository, activeTokenRepository, emailService
            });
            const change = createChangePasswordService({
                userRepository, userPasswordRepository, activeTokenRepository, mysqlSequelizeClient
            });

            await forgot.forgotPassword({ email: user.email });
            const message = emailService.sendEmail.mock.calls[0][0];
            const token = new URL(message.templateData.resetUrl).searchParams.get('token');
            const input = { token, newPassword: 'new-password' };

            await expect(change.changePassword(input)).resolves.toMatchObject({ success: true });
            await expect(change.changePassword(input)).rejects.toMatchObject({
                name: 'AuthenticationError'
            });
            expect(userPasswordRepository.updateByUserId).toHaveBeenCalledTimes(1);
        } finally {
            config.auth.jwt.jwtPasswordResetTokenSecret = originalSecret;
            config.auth.jwt.jwtPasswordResetTokenTtlSeconds = originalTtl;
            config.apps.mainApp.apiBaseUrl = originalBaseUrl;
            config.auth.basic.hashSaltRounds = originalSaltRounds;
        }
    });
});
