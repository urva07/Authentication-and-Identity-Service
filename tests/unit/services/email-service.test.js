const createEmailService = require('../../../src/services/email.service');

describe('email service', () => {
    const emailConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        from: 'noreply@example.com'
    };

    test('sends an email using the configured sender and transport', async () => {
        const result = { messageId: 'message-1' };
        const transporter = {
            sendMail: jest.fn().mockResolvedValue(result)
        };
        const emailService = createEmailService({ transporter, emailConfig });

        await expect(emailService.sendEmail({
            to: ' user@example.com ',
            subject: 'Verify your email',
            text: 'Your verification code is 123456',
            html: '<p>Your verification code is 123456</p>'
        })).resolves.toBe(result);

        expect(transporter.sendMail).toHaveBeenCalledWith({
            from: 'noreply@example.com',
            to: 'user@example.com',
            subject: 'Verify your email',
            text: 'Your verification code is 123456',
            html: '<p>Your verification code is 123456</p>'
        });
    });

    test('requires recipient, subject, and message content', async () => {
        const emailService = createEmailService({
            transporter: { sendMail: jest.fn() },
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
            sendMail: jest.fn().mockRejectedValue(error)
        };
        const emailService = createEmailService({ transporter, emailConfig });

        await expect(emailService.sendEmail({
            to: 'user@example.com',
            subject: 'Subject',
            text: 'Message'
        })).rejects.toBe(error);
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
