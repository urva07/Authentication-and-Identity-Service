const {
    describe,
    afterEach,
    test,
    expect,
    jest: jestApi
} = require('@jest/globals');
const { destroyIdleSockets, openSockets } = require('../../../src/lib/openSockets');

describe('open sockets', () => {
    afterEach(() => {
        openSockets.clear();
    });

    test('destroys idle sockets and leaves sockets with active requests open', () => {
        const idleSocket = { inflightRequests: 0, destroy: jestApi.fn() };
        const busySocket = { inflightRequests: 1, destroy: jestApi.fn() };
        openSockets.add(idleSocket);
        openSockets.add(busySocket);

        destroyIdleSockets();

        expect(idleSocket.destroy).toHaveBeenCalledTimes(1);
        expect(busySocket.destroy).not.toHaveBeenCalled();
    });

    test('does nothing when no sockets are open', () => {
        expect(() => destroyIdleSockets()).not.toThrow();
    });
});
