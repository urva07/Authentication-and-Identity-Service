const { createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');

const generateAes256GcmToken = (payload, encryptionKey) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    cipher.setAAD(Buffer.from('v1'));
    const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(payload), 'utf8'),
        cipher.final()
    ]);

    return [
        'v1',
        iv.toString('base64url'),
        cipher.getAuthTag().toString('base64url'),
        ciphertext.toString('base64url')
    ].join('.');
};

const verifyAes256GcmToken = (token, encryptionKey) => {
    const [version, ivBase64, authTagBase64, ciphertextBase64] = token.split('.');
    if (version !== 'v1') {
        throw new Error('Unsupported token version');
    }
    const iv = Buffer.from(ivBase64, 'base64url');
    const authTag = Buffer.from(authTagBase64, 'base64url');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAAD(Buffer.from('v1'));
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
};

module.exports = { generateAes256GcmToken, verifyAes256GcmToken };