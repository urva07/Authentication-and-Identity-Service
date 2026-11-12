const stableStringify = require("fast-json-stable-stringify");

const UUID_DASH_POSITIONS = [8, 13, 18, 23];
const UUID_LENGTH = 36;

const isUuid = (value) => value.length === UUID_LENGTH &&
    [...value].every((character, index) => {
        if (UUID_DASH_POSITIONS.includes(index)) {
            return character === '-';
        }

        return '0123456789abcdef'.includes(character.toLowerCase());
    });

function createCoalescingKey({db, repository, method, args}) {
    const isUserIdLookup = (
        db.toLowerCase() === 'mysql' &&
        (
            (
                repository.toLowerCase() === 'userrepository' &&
                method.toLowerCase() === 'findbyid'
            ) ||
            (
                repository.toLowerCase() === 'userpasswordrepository' &&
                method.toLowerCase() === 'findbyuserid'
            )
        ) &&
        Array.isArray(args) &&
        args.length === 1 &&
        typeof args[0] === 'string' &&
        isUuid(args[0])
    );
    const keyArgs = isUserIdLookup ? [args[0].toLowerCase()] : args;

    return `${db.toLowerCase()}:${repository.toLowerCase()}:${method.toLowerCase()}:${stableStringify(keyArgs)}`;
}


module.exports = createCoalescingKey;