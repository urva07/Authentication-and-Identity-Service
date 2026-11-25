const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const createEmailService = require('../../../src/services/mainApp/auth/email.service');
const { ExternalServiceTimeoutError } = require('../../../src/errors');

describe('email service', () => {
    const emailConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        from: 'noreply@example.com'
    };

    test('sends an email using the configured sender and transport', async () => {
        const result = { messageId: 'message-1' };
        const requestLogger = { debug: jestApi.fn() };
        const transporter = {
            sendMail: jestApi.fn().mockResolvedValue(result)
        };
        const emailService = createEmailService({ transporter, emailConfig });

        await expect(emailService.sendEmail({
            to: ' user@example.com ',
            subject: 'Verify your email',
            text: 'Your verification code is 123456',
            html: '<p>Your verification code is 123456</p>'
        }, undefined, requestLogger)).resolves.toBe(result);

        expect(requestLogger.debug).toHaveBeenCalled();
        expect(transporter.sendMail).toHaveBeenCalledWith({
            from: 'noreply@example.com',
            to: 'user@example.com',
            subject: 'Verify your email',
            text: 'Your verification code is 123456',
            html: '<p>Your verification code is 123456</p>'
        });
    });

    test('renders a named template in synchronous mode', async () => {
        const transporter = {
            sendMail: jestApi.fn().mockResolvedValue({ messageId: 'template-1' })
        };
        const emailService = createEmailService({
            transporter,
            emailConfig: { ...emailConfig, deliveryMode: 'sync' }
        });

        await emailService.sendEmail({
            to: 'user@example.com',
            subject: 'Verify your email address',
            template: 'verify-email',
            templateData: {
                name: 'Ada',
                verificationUrl: 'https://example.com/verify/token',
                tokenExpiry: '30 minutes'
            }
        });

        const mail = transporter.sendMail.mock.calls[0][0];
        expect(mail.html).toContain('Ada');
        expect(mail.html).toContain('https://example.com/verify/token');
    });

    test('queues template metadata in asynchronous mode', async () => {
        const mailProducer = {
            queueName: 'mail',
            addMailJob: jestApi.fn().mockResolvedValue({ id: 'job-1' })
        };
        const emailService = createEmailService({
            deliveryMode: 'async',
            emailConfig: { deliveryMode: 'async' },
            mailProducer
        });

        await expect(emailService.sendEmail({
            to: 'user@example.com',
            subject: 'Reset your password',
            template: 'forgot-password',
            templateData: {
                name: 'Ada',
                resetUrl: 'https://example.com/reset/token',
                tokenExpiry: '15 minutes'
            }
        })).resolves.toMatchObject({ queued: true, jobId: 'job-1' });

        expect(mailProducer.addMailJob).toHaveBeenCalledWith({
            name: 'forgot-password',
            to: 'user@example.com',
            template: 'forgot-password',
            subject: 'Reset your password',
            data: {
                name: 'Ada',
                resetUrl: 'https://example.com/reset/token',
                tokenExpiry: '15 minutes'
            }
        });
    });

    test('requires recipient, subject, and message content', async () => {
        const emailService = createEmailService({
            transporter: { sendMail: jestApi.fn() },
            emailConfig
        });

        await expect(emailService.sendEmail({
            to: ' ',
            subject: 'Subject',
            text: 'Message'
        })).rejects.toThrow('Email recipient is required');
        await expect(emailService.sendEmail({
            to: 'user@example.com',
            subject: ' ',
            text: 'Message'
        })).rejects.toThrow('Email subject is required');
        await expect(emailService.sendEmail({
            to: 'user@example.com',
            subject: 'Subject'
        })).rejects.toThrow('Email text or HTML content is required');
    });

    test('forwards transport errors to the caller', async () => {
        const error = new Error('SMTP delivery failed');
        const transporter = {
            sendMail: jestApi.fn().mockRejectedValue(error)
        };
        const emailService = createEmailService({ transporter, emailConfig });

        await expect(emailService.sendEmail({
            to: 'user@example.com',
            subject: 'Subject',
            text: 'Message'
        })).rejects.toBe(error);
    });

    test('rejects when an abort signal is triggered', async () => {
        const abortController = new AbortController();
        const transporter = {
            sendMail: jestApi.fn(() => new Promise(() => {}))
        };
        const emailService = createEmailService({ transporter, emailConfig });
        const sending = emailService.sendEmail({
            to: 'user@example.com',
            subject: 'Subject',
            text: 'Message'
        }, abortController.signal);

        abortController.abort();

        await expect(sending).rejects.toBeInstanceOf(ExternalServiceTimeoutError);
    });

    test.each([
        [{ ...emailConfig, from: '' }, 'Email configuration requires EMAIL_FROM'],
        [{ ...emailConfig, host: '' }, 'Email configuration requires EMAIL_HOST'],
        [{ ...emailConfig, user: 'mailer@example.com' }, 'both EMAIL_USER and EMAIL_PASSWORD'],
        [{ ...emailConfig, password: 'secret' }, 'both EMAIL_USER and EMAIL_PASSWORD']
    ])('validates SMTP configuration: %j', (invalidConfig, message) => {
        expect(() => createEmailService({ emailConfig: invalidConfig }))
            .toThrow(message);
    });
});
