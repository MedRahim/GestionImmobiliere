/**
 * Optional SMS delivery for password codes.
 * Configure on Azure:
 *   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM
 * or SMS_WEBHOOK_URL (POST {to, message})
 */
exports.sendSmsCode = async ({to, code}) => {
  if (!to) return {sent: false, reason: 'no_phone'};

  const phone = String(to).replace(/\s+/g, '');
  const message = `Immo Dary: votre code est ${code} (valable 15 min).`;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (sid && token && from) {
    try {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const body = new URLSearchParams({To: phone, From: from, Body: message});
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        },
      );
      if (!res.ok) {
        const txt = await res.text();
        console.error('[SMS] Twilio failed', txt);
        return {sent: false, reason: 'twilio_error'};
      }
      console.log('[SMS] Twilio sent to', phone);
      return {sent: true, provider: 'twilio'};
    } catch (err) {
      console.error('[SMS] Twilio error', err.message);
      return {sent: false, reason: err.message};
    }
  }

  const webhook = process.env.SMS_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({to: phone, message, code}),
      });
      if (!res.ok) return {sent: false, reason: 'webhook_error'};
      return {sent: true, provider: 'webhook'};
    } catch (err) {
      return {sent: false, reason: err.message};
    }
  }

  console.log(`[SMS] (not configured) would send to ${phone}: ${code}`);
  return {sent: false, reason: 'sms_not_configured'};
};
