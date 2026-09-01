/**
 * Password-reset email via SMTP (SendGrid, etc.).
 * Requires SMTP_HOST, SMTP_USER, SMTP_PASS.
 */
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

let transporterPromise = null;

async function getTransporter() {
  if (!nodemailer) return null;
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('[Mailer] SMTP_* not configured');
      return null;
    }

    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {user, pass},
    });
  })();

  return transporterPromise;
}

exports.sendPasswordResetEmail = async ({to, code, firstName}) => {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      return {sent: false};
    }

    const from =
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      '"Immo Dary" <noreply@immodary.app>';

    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Immo Dary — Code de réinitialisation',
      text: `Bonjour ${firstName || ''},\n\nVotre code : ${code}\nValable 15 minutes.\n\n— Immo Dary`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#EDF7F9;border-radius:12px">
          <h2 style="color:#1B3A57">Immo Dary</h2>
          <p>Bonjour ${firstName || ''},</p>
          <p>Votre code de réinitialisation :</p>
          <p style="font-size:28px;letter-spacing:6px;font-weight:bold;color:#1ECAD3;background:#fff;padding:16px;border-radius:10px;text-align:center">${code}</p>
          <p style="color:#5A6B7D;font-size:13px">Valable 15 minutes.</p>
        </div>
      `,
    });

    console.log(`[Mailer] Reset email sent to ${to}`);
    return {sent: true, messageId: info.messageId};
  } catch (err) {
    console.error('[Mailer] send failed:', err.message);
    return {sent: false, error: err.message};
  }
};
