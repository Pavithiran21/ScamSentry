const { escapeHtml } = require('../../utils/html');

// Brand colours from UI-UX.md: charcoal band, copper button, warm stone page.
const CHARCOAL = '#17181c';
const COPPER = '#93501f';
const COPPER_TEXT = '#8a4a22';
const STONE = '#f1efec';
const LINE = '#e2ddd6';
const TEXT = '#2a2c31';
const MUTED = '#5f5c57';
const FONT = "Figtree,'Segoe UI',Arial,Helvetica,sans-serif";
const HEADING_FONT = "Outfit,'Segoe UI',Arial,Helvetica,sans-serif";

/**
 * Shared frame: a charcoal band with the wordmark ("Scam" white, "Sentry" copper), then a
 * white card on the stone page. Tables and inline styles, because email clients ignore most
 * CSS. bodyHtml must already be escaped.
 */
function layout(title, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:${STONE};font-family:${FONT};color:${TEXT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${STONE};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-top:3px solid ${COPPER};border-radius:12px;border-collapse:separate;overflow:hidden">
        <tr><td style="background:${CHARCOAL};padding:18px 24px;font-family:${HEADING_FONT};font-weight:800;font-size:20px">
          <span style="color:#ffffff">Scam</span><span style="color:#f0b98f">Sentry</span>
        </td></tr>
        <tr><td style="padding:24px;font-size:16px;line-height:1.6">
          <h1 style="margin:0 0 12px;font-family:${HEADING_FONT};font-size:24px;line-height:1.25;color:${CHARCOAL}">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
      </table>
      <p style="max-width:560px;margin:14px auto 0;font-size:14px;color:${MUTED}">ScamSentry checks suspicious messages. We never ask for your password, OTP or PIN.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(label, url) {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:${COPPER};color:#ffffff;border-radius:10px;padding:12px 20px;font-family:${HEADING_FONT};font-weight:700;font-size:16px;text-decoration:none">${escapeHtml(label)}</a>`;
}

/** The password reset email: a single-use link that works for 30 minutes. */
function passwordResetEmail(resetLink) {
  const subject = 'Reset your ScamSentry password';
  const html = layout(
    'Reset your password',
    `<p style="margin:0 0 16px">We got a request to reset the password for your ScamSentry account. The link works once, for 30 minutes.</p>
     <p style="margin:0 0 20px">${button('Choose a new password', resetLink)}</p>
     <p style="margin:0 0 8px;font-size:14px;color:${MUTED}">If the button doesn't work, copy this link into your browser:</p>
     <p style="margin:0 0 16px;font-size:14px;word-break:break-all"><a href="${escapeHtml(resetLink)}" style="color:${COPPER_TEXT}">${escapeHtml(resetLink)}</a></p>
     <p style="margin:0;font-size:14px;color:${MUTED}">Didn't ask for this? You can ignore this email: your password stays the same.</p>`,
  );
  const text = [
    'Reset your ScamSentry password',
    '',
    'We got a request to reset the password for your ScamSentry account. The link works once, for 30 minutes:',
    resetLink,
    '',
    "Didn't ask for this? You can ignore this email: your password stays the same.",
  ].join('\n');
  return { subject, html, text };
}

module.exports = { passwordResetEmail };
