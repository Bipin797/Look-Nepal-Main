const nodemailer = require('nodemailer');

// Configure your email transport here
// For testing, you can use ethereal.email or a real SMTP if you have credentials
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT || 587,
    auth: {
        user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
        pass: process.env.EMAIL_PASS || 'ethereal_password'
    }
});

/**
 * Send an email notification
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async (options) => {
    try {
        const info = await transporter.sendMail({
            from: '"Look Nepal Jobs" <noreply@looknepal.com>',
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
        console.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        if (process.env.NODE_ENV !== 'production' && info.messageId.includes('ethereal')) {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
        return info;
    } catch (error) {
        console.error('Email sending error:', error);
        // We don't want to break the main application flow if email fails, 
        // so we log the error but don't strictly throw it unless required.
        return null;
    }
};

module.exports = {
    sendEmail
};
