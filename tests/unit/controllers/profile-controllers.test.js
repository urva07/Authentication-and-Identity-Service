const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const createMeController = require('../../../src/controllers/mainApp/v1/profile/me.controller');
const createProfileByIdController = require('../../../src/controllers/mainApp/v1/profile/profileById.controller');

const createRes = () => ({
    status: jestApi.fn().mockReturnThis(),
    json: jestApi.fn()
});

describe('me controller', () => {
    test('get returns the authenticated user profile', async () => {
        const profile = { id: 'u1' };
        const service = { getMyProfile: jestApi.fn().mockResolvedValue(profile) };
        const req = { user: { id: 'u1' }, log: {} };
        const res = createRes();
        const next = jestApi.fn();

        await createMeController(service).get(req, res, next);

        expect(service.getMyProfile).toHaveBeenCalledWith(req.user, req.log);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: { profile } });
        expect(next).not.toHaveBeenCalled();
    });

    test('patch passes the validated body to the service', async () => {
        const profile = { id: 'u1', firstName: 'Ada' };
        const service = { updateMyProfile: jestApi.fn().mockResolvedValue(profile) };
        const req = { user: { id: 'u1' }, body: { firstName: 'Ada' }, log: {} };
        const res = createRes();

        await createMeController(service).patch(req, res, jestApi.fn());

        expect(service.updateMyProfile).toHaveBeenCalledWith(req.user, req.body, req.log);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: { profile } });
    });

    test('delete calls the service and returns success', async () => {
        const service = { deleteMyProfile: jestApi.fn().mockResolvedValue(undefined) };
        const req = { user: { id: 'u1' }, log: {} };
        const res = createRes();
        const next = jestApi.fn();

        await createMeController(service).delete(req, res, next);

        expect(service.deleteMyProfile).toHaveBeenCalledWith(req.user, req.log);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service errors', async () => {
        const error = new Error('boom');
        const service = {
            getMyProfile: jestApi.fn().mockRejectedValue(error),
            updateMyProfile: jestApi.fn().mockRejectedValue(error),
            deleteMyProfile: jestApi.fn().mockRejectedValue(error)
        };
        const controller = createMeController(service);
        const next = jestApi.fn();

        await controller.get({}, createRes(), next);
        await controller.patch({}, createRes(), next);
        await controller.delete({}, createRes(), next);

        expect(next).toHaveBeenNthCalledWith(1, error);
        expect(next).toHaveBeenNthCalledWith(2, error);
        expect(next).toHaveBeenNthCalledWith(3, error);
    });
});

describe('profile by id controller', () => {
    test('returns the requested profile', async () => {
        const profile = { id: 'u2' };
        const service = { getProfileById: jestApi.fn().mockResolvedValue(profile) };
        const req = { user: { id: 'u1' }, params: { id: 'u2' }, log: {} };
        const res = createRes();

        await createProfileByIdController(service).get(req, res, jestApi.fn());

        expect(service.getProfileById).toHaveBeenCalledWith(req.user, 'u2', req.log);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: { profile } });
    });

    test('forwards service errors', async () => {
        const error = new Error('not found');
        const service = { getProfileById: jestApi.fn().mockRejectedValue(error) };
        const next = jestApi.fn();

        await createProfileByIdController(service).get({ params: {} }, createRes(), next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
