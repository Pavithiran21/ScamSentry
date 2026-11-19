const { AppError } = require('../../utils/AppError');

const MAX_MESSAGE_LENGTH = 5000;

// Characters that are invisible on screen but change what a link or word really is:
// zero-width spaces and joiners, the byte-order mark, the soft hyphen, and the bidirectional
// controls that can make "moc.knab" display as "bank.com". Scammers use them to hide
// lookalike links from people and from keyword rules.
const INVISIBLE_CHARACTERS = /[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

// Control characters other than tab, newline and carriage return.
// eslint-disable-next-line no-control-regex -- removing control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Turns pasted text into the exact text every later step works on:
 *   1. NFKC normalisation folds lookalike forms into plain ones (fullwidth "ｓｂｉ" -> "sbi",
 *      the "ﬁ" ligature -> "fi"), so rules and the cache see the same text however it was typed;
 *   2. invisible and control characters are removed;
 *   3. Windows line ends become "\n", and the text is trimmed.
 * The evidence offsets in a report point into this cleaned text, and it is the text returned
 * to the browser and saved for a signed-in user, so the highlights always line up.
 */
function sanitizeMessage(raw) {
  return raw
    .normalize('NFKC')
    .replace(INVISIBLE_CHARACTERS, '')
    .replace(CONTROL_CHARACTERS, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

/** Throws the validation errors the Check page shows; returns the cleaned text. */
function cleanAndValidate(raw) {
  if (typeof raw !== 'string') {
    throw validationError('Paste a message or link to check.');
  }
  // Checked on the raw text too, so a huge paste is refused before any work is done on it.
  if (raw.length > MAX_MESSAGE_LENGTH * 2) {
    throw tooLong();
  }
  const text = sanitizeMessage(raw);
  if (text.length === 0) {
    throw validationError('Paste a message or link to check.');
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw tooLong();
  }
  return text;
}

function validationError(message) {
  return new AppError(400, 'VALIDATION_FAILED', 'Some fields are not valid.', [{ field: 'text', message }]);
}

function tooLong() {
  const message = `That's too long to check. Paste at most ${MAX_MESSAGE_LENGTH.toLocaleString('en-IN')} characters.`;
  return new AppError(400, 'TEXT_TOO_LONG', message, [{ field: 'text', message }]);
}

module.exports = { MAX_MESSAGE_LENGTH, sanitizeMessage, cleanAndValidate };
