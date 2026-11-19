const { brandById } = require('./rules');

// "What to do now" is written by code from the verdict and the flags, never by the model.
// A scam message that hijacks the model can therefore never put its own phone number or
// link into the advice we show.

const REPORT_LINE = 'Report it at cybercrime.gov.in or call 1930.';

function hasCategory(flags, category) {
  return flags.some((flag) => flag.category === category);
}

function contactLine(brand) {
  if (brand.kind === 'bank') {
    return `Call ${brand.name} on the number printed on your card.`;
  }
  return `Contact ${brand.name} only through its official app or website.`;
}

function likelyScamAdvice({ flags, links, brand }) {
  const advice = [links.length > 0 ? "Don't open the link or reply." : "Don't reply or call back."];
  if (brand) {
    advice.push(contactLine(brand));
  } else if (hasCategory(flags, 'credentials')) {
    advice.push('Never share an OTP, PIN or password, whoever asks.');
  } else if (hasCategory(flags, 'money')) {
    advice.push("Don't send any money or pay any fee.");
  }
  advice.push(REPORT_LINE);
  return advice;
}

function suspiciousAdvice({ flags, links, brand }) {
  const advice = [];
  if (hasCategory(flags, 'money') && links.length > 0) {
    advice.push("Don't pay through this link.");
  } else if (links.length > 0) {
    advice.push("Don't open the link until you've checked it another way.");
  } else {
    advice.push("Don't pay or share any details until you've checked.");
  }

  if (brand?.kind === 'courier') {
    advice.push("Open the courier's own app or website yourself and check the tracking number.");
    advice.push("Still unsure? Call the number on the courier's website.");
  } else if (brand) {
    advice.push(`Check with ${brand.name} directly, through its official app or website.`);
    advice.push('If you have already paid or shared details, call 1930 straight away.');
  } else {
    advice.push('Check with the sender another way, for example on a number you already know.');
    advice.push('If you have already paid or shared details, call 1930 straight away.');
  }
  return advice;
}

function safeAdvice({ text }) {
  if (/\b(?:otp|one[- ]time password|verification code)\b/i.test(text)) {
    return [
      'Use the code only in the app or site that sent it.',
      'Never tell it to anyone, even if they say they are from your bank.',
    ];
  }
  return [
    'Nothing to do: this looks like a normal message.',
    'Check again if a later message asks for a code, a payment or a new link.',
  ];
}

/** The numbered "What to do now" lines for a finished check. */
function buildAdvice({ verdict, text, flags, links, brandIds }) {
  const brand = brandIds.length > 0 ? brandById(brandIds[0]) : null;
  if (verdict === 'likely_scam') {
    return likelyScamAdvice({ flags, links, brand });
  }
  if (verdict === 'suspicious') {
    return suspiciousAdvice({ flags, links, brand });
  }
  return safeAdvice({ text });
}

module.exports = { buildAdvice };
