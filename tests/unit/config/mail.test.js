const { jest: jestApi, describe, beforeEach, test, expect } = require('@jest/globals');
jestApi.mock('nodemailer', () => ({
    createTransport: jestApi.fn()
}));

const nodemailer = require('nodemailer');
const createMailClient = require('../../../src/integrations/mailClient');

describe('mail configuration', () => {
    beforeEach(() => {
        nodemailer.createTransport.mockReset();
    });

    test('creates an unauthenticated SMTP transport', () => {
        const transport = { sendMail: jestApi.fn() };
        nodemailer.createTransport.mockReturnValue(transport);

        const result = createMailClient({
            host: 'smtp.example.com',
            port: 587,
            secure: false
        });

        expect(result).toBe(transport);
        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            auth: {
                user: undefined,
                pass: undefined
            }
        });
    });

    test('adds SMTP authentication when credentials are configured', () => {
        createMailClient({
            host: 'smtp.example.com',
            port: 465,
            secure: true,
            user: 'mailer@example.com',
            password: 'smtp-password'
        });

        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            host: 'smtp.example.com',
            port: 465,
            secure: true,
            auth: {
                user: 'mailer@example.com',
                pass: 'smtp-password'
            }
        });
    });

    test.each([
        [{ port: 587, secure: false }, 'Email configuration requires EMAIL_HOST'],
        [
            { host: 'smtp.example.com', user: 'mailer@example.com' },
            'both EMAIL_USER and EMAIL_PASSWORD'
        ],
        [
            { host: 'smtp.example.com', password: 'smtp-password' },
            'both EMAIL_USER and EMAIL_PASSWORD'
        ]
    ])('rejects incomplete SMTP settings: %j', (emailConfig, message) => {
        expect(() => createMailClient(emailConfig)).toThrow(message);
        expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });
});
