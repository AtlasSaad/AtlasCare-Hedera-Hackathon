const nodemailer = require('nodemailer');

async function createTransport() {
  // Prefer configured SMTP; fallback to ethereal for dev; final fallback logs only
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Boolean(process.env.SMTP_SECURE === 'true'),
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
  }
  try {
    const test = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: test.user, pass: test.pass }
    });
  } catch (_) {
    return null;
  }
}

/**
 * Sends an email; if SMTP unavailable, logs to console. Supports attachments.
 * options: { to, subject, text, html?, attachments?: [{ filename, content, contentType }] }
 */
async function sendEmail(options) {
  const { to, subject, text, html, attachments, prescriptionId } = options || {};
  const transport = await createTransport();
  if (!transport) {
    console.log('\n=== Email Fallback (console) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text}`);
    if (attachments?.length) console.log(`Attachments: ${attachments.map(a => a.filename).join(', ')}`);
    console.log('===============================\n');
    return { success: true, message: 'Logged email to console (no SMTP)', previewUrl: null };
  }
  
  const info = await transport.sendMail({ 
    from: process.env.MAIL_FROM || 'no-reply@atlascare.local', 
    to, subject, text, html, attachments 
  });
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  return { success: true, messageId: info.messageId, previewUrl };
}

module.exports = { sendEmail };
