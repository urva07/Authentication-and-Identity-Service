const { test, expect, jest: jestApi } = require('@jest/globals');
const notImplemented = require('../../../src/middlewares/notImplemented.middleware');

test('returns a 501 response', () => {
    const res = {
        status: jestApi.fn().mockReturnThis(),
        json: jestApi.fn()
    };

    notImplemented({}, res, jestApi.fn());

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not implemented'
    });
});
