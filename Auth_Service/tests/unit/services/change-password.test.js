const {
    describe,
    beforeEach,
    afterAll,
    jest: jestApi,
    test,
    expect
} = require('@jest/globals');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../../../src/config/config');
const { AuthenticationError } = require('../../../src/errors');
const createChangePasswordService = require('../../../src/services/mainApp/auth/changePassword.service');
const createChangePasswordController = require('../../../src/controllers/mainApp/v1/auth/changePassword.controller');

describe('change password', () => {
    const secret = 'c3a1f5d9b7e24680a1c3e5f70912b4d6e8f0a2c4b6d8e0f1a3b5c7d9e1f30415';
    const originalSecret = config.auth.jwt.jwtPasswordResetTokenSecret;
    const user = { id: 'user-1', email: 'ada@example.com' };
    const tokenId = 'c0e0a1a0-70b5-48c3-85b4-a00000000001';
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    let userRepository;
    let userPasswordRepository;
    let activeTokenRepository;
    let mysqlSequelizeClient;
    let service;

    const createToken = (payload = {}, options = {}) => jwt.sign(
        {
            sub: user.id,
            email: user.email,
            purpose: 'password-reset',
            jti: tokenId,
            exp: Math.floor(Date.now() / 1000) + 900,
            ...payload
        },
        options.secret || secret,
        options.signOptions
    );

    beforeEach(() => {
        config.auth.jwt.jwtPasswordResetTokenSecret = secret;
        userRepository = {
            findById: jestApi.fn().mockResolvedValue(user)
        };
        userPasswordRepository = {
            updateByUserId: jestApi.fn().mockResolvedValue([1])
        };
        activeTokenRepository = { consume: jestApi.fn().mockResolvedValue(1) };
        mysqlSequelizeClient = {
            transaction: jestApi.fn((callback) => callback(transaction))
        };
        service = createChangePasswordService({
            userRepository,
            userPasswordRepository,
            activeTokenRepository,
            mysqlSequelizeClient
        });
    });

    afterAll(() => {
        config.auth.jwt.jwtPasswordResetTokenSecret = originalSecret;
    });

    test('verifies the reset token and updates the password for its user', async () => {
        const requestLogger = { debug: jestApi.fn() };
        const input = {
            token: createToken(),
            newPassword: 'new-password'
        };

        const result = await service.changePassword(input, requestLogger);

        expect(mysqlSequelizeClient.transaction).toHaveBeenCalledTimes(1);
        expect(userRepository.findById).toHaveBeenCalledWith(user.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        expect(userPasswordRepository.updateByUserId).toHaveBeenCalledWith(
            user.id,
            { passwordHash: expect.any(String) },
            { transaction }
        );
        expect(activeTokenRepository.consume).toHaveBeenCalledWith({
            tokenType: 'password-reset',
            jti: tokenId,
            userId: user.id
        }, { transaction });
        expect(activeTokenRepository.consume.mock.invocationCallOrder[0])
            .toBeLessThan(userPasswordRepository.updateByUserId.mock.invocationCallOrder[0]);
        const passwordHash = userPasswordRepository.updateByUserId.mock.calls[0][1].passwordHash;
        expect(await bcrypt.compare('new-password', passwordHash)).toBe(true);
        expect(result).toEqual({
            success: true,
            message: 'Password has been changed successfully.'
        });
        expect(requestLogger.debug).toHaveBeenCalled();
    });

    test.each([
        ['malformed token', () => 'not-a-token'],
        ['wrong signing secret', () => createToken({}, { secret: `${secret}-wrong` })],
        ['expired token', () => createToken({ exp: Math.floor(Date.now() / 1000) - 1 })],
        ['wrong purpose', () => createToken({ purpose: 'access' })],
        ['missing user ID', () => createToken({ sub: undefined })],
        ['missing email', () => createToken({ email: undefined })],
        ['missing jti', () => createToken({ jti: undefined })],
        ['invalid jti', () => createToken({ jti: 'not-a-uuid' })],
        ['missing expiration', () => jwt.sign({
            sub: user.id,
            email: user.email,
            purpose: 'password-reset',
            jti: tokenId
        }, secret)]
    ])('rejects a %s without changing a password', async (label, getToken) => {
        await expect(service.changePassword({
            token: getToken(),
            newPassword: 'new-password'
        })).rejects.toBeInstanceOf(AuthenticationError);

        expect(userRepository.findById).not.toHaveBeenCalled();
        expect(userPasswordRepository.updateByUserId).not.toHaveBeenCalled();
        expect(mysqlSequelizeClient.transaction).not.toHaveBeenCalled();
    });

    test('rejects the reset link if the account email has changed', async () => {
        userRepository.findById.mockResolvedValue({
            ...user,
            email: 'new-address@example.com'
        });

        await expect(service.changePassword({
            token: createToken(),
            newPassword: 'new-password'
        })).rejects.toMatchObject({
            name: 'AuthenticationError',
            statusCode: 401
        });
        expect(userPasswordRepository.updateByUserId).not.toHaveBeenCalled();
    });

    test('checks the email returned after waiting for the user row lock', async () => {
        let releaseLockedRead;
        let notifyReadStarted;
        const readStarted = new Promise((resolve) => {
            notifyReadStarted = resolve;
        });
        const lockedRead = new Promise((resolve) => {
            releaseLockedRead = resolve;
        });
        userRepository.findById.mockImplementation(() => {
            notifyReadStarted();
            return lockedRead;
        });
        const request = service.changePassword({
            token: createToken(),
            newPassword: 'new-password'
        });

        await readStarted;
        expect(userRepository.findById).toHaveBeenCalledWith(user.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        expect(userPasswordRepository.updateByUserId).not.toHaveBeenCalled();

        releaseLockedRead({ ...user, email: 'new-address@example.com' });
        await expect(request).rejects.toBeInstanceOf(AuthenticationError);
        expect(userPasswordRepository.updateByUserId).not.toHaveBeenCalled();
    });

    test('rejects a missing account or password record', async () => {
        userRepository.findById.mockResolvedValue(null);

        await expect(service.changePassword({
            token: createToken(),
            newPassword: 'new-password'
        })).rejects.toBeInstanceOf(AuthenticationError);

        userRepository.findById.mockResolvedValue(user);
        userPasswordRepository.updateByUserId.mockResolvedValue([0]);

        await expect(service.changePassword({
            token: createToken(),
            newPassword: 'new-password'
        })).rejects.toBeInstanceOf(AuthenticationError);
    });

    test('propagates password repository errors', async () => {
        const error = new Error('database unavailable');
        userPasswordRepository.updateByUserId.mockRejectedValue(error);

        await expect(service.changePassword({
            token: createToken(),
            newPassword: 'new-password'
        })).rejects.toBe(error);
    });

    test('rejects a missing, expired, or already-consumed token', async () => {
        activeTokenRepository.consume.mockResolvedValue(0);

        await expect(service.changePassword({
            token: createToken(),
            newPassword: 'new-password'
        })).rejects.toBeInstanceOf(AuthenticationError);

        expect(userPasswordRepository.updateByUserId).not.toHaveBeenCalled();
    });

    test('rolls back token consumption when the password update fails', async () => {
        let tokenExists = true;
        const error = new Error('password update failed');
        activeTokenRepository.consume.mockImplementation(async (criteria, options) => {
            options.transaction.consumed = true;
            return tokenExists ? 1 : 0;
        });
        mysqlSequelizeClient.transaction.mockImplementation(async (callback) => {
            const tx = { LOCK: { UPDATE: 'UPDATE' } };
            const result = await callback(tx);
            if (tx.consumed) tokenExists = false;
            return result;
        });
        userPasswordRepository.updateByUserId.mockRejectedValueOnce(error);
        const input = { token: createToken(), newPassword: 'new-password' };

        await expect(service.changePassword(input)).rejects.toBe(error);
        expect(tokenExists).toBe(true);
        await expect(service.changePassword(input)).resolves.toMatchObject({ success: true });
        expect(tokenExists).toBe(false);
    });

    test('only one concurrent redemption can succeed', async () => {
        let tokenExists = true;
        let queue = Promise.resolve();
        mysqlSequelizeClient.transaction.mockImplementation((callback) => {
            const run = queue.then(async () => {
                const tx = { LOCK: { UPDATE: 'UPDATE' } };
                const result = await callback(tx);
                if (tx.consumed) tokenExists = false;
                return result;
            });
            queue = run.catch(() => {});
            return run;
        });
        activeTokenRepository.consume.mockImplementation(async (criteria, options) => {
            if (!tokenExists) return 0;
            options.transaction.consumed = true;
            return 1;
        });
        const input = { token: createToken(), newPassword: 'new-password' };

        const outcomes = await Promise.allSettled([
            service.changePassword(input),
            service.changePassword(input)
        ]);
        expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(outcomes.filter((result) => result.status === 'rejected')[0].reason)
            .toBeInstanceOf(AuthenticationError);
        expect(userPasswordRepository.updateByUserId).toHaveBeenCalledTimes(1);
    });

    test('waits for the transaction to commit before reporting success', async () => {
        let finishCommit;
        let finishUpdate;
        const commit = new Promise((resolve) => {
            finishCommit = resolve;
        });
        const updateCompleted = new Promise((resolve) => {
            finishUpdate = resolve;
        });
        mysqlSequelizeClient.transaction.mockImplementation(async (callback) => {
            await callback(transaction);
            finishUpdate();
            await commit;
        });
        const response = jestApi.fn();
        const pending = service.changePassword({
            token: createToken(),
            newPassword: 'new-password'
        }).then(response);

        await updateCompleted;
        expect(response).not.toHaveBeenCalled();
        finishCommit();
        await pending;
        expect(response).toHaveBeenCalledWith({
            success: true,
            message: 'Password has been changed successfully.'
        });
    });

    test('propagates transaction commit errors instead of reporting success', async () => {
        const error = new Error('transaction commit failed');
        mysqlSequelizeClient.transaction.mockImplementation(async (callback) => {
            await callback(transaction);
            throw error;
        });

        await expect(service.changePassword({
            token: createToken(),
            newPassword: 'new-password'
        })).rejects.toBe(error);
    });

    test('controller forwards validated input and returns the service result', async () => {
        const result = { success: true, message: 'Password changed' };
        const changePasswordService = {
            changePassword: jestApi.fn().mockResolvedValue(result)
        };
        const controller = createChangePasswordController(changePasswordService);
        const req = {
            body: { token: 'reset-token', newPassword: 'new-password' },
            log: { debug: jestApi.fn() }
        };
        const res = { status: jestApi.fn().mockReturnThis(), json: jestApi.fn() };
        const next = jestApi.fn();

        await controller.post(req, res, next);

        expect(changePasswordService.changePassword).toHaveBeenCalledWith(
            req.body,
            req.log
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(result);
        expect(next).not.toHaveBeenCalled();
    });
});
