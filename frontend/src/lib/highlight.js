import { isValidRange } from './flags';

/**
 * Splits the message into plain parts and highlighted parts for <mark> elements, from the
 * offsets the API sent: each flag's evidence and each link's position. The text is never parsed
 * as HTML; React renders every part as text.
 *
 * Ranges outside the text or the wrong way round are dropped. When two ranges overlap, the one
 * that starts first (or, at the same start, the longer one) wins and the other is skipped, so a
 * word is never highlighted twice.
 *
 * Returns [{ text, kind }] where kind is null (plain), 'flag' or 'link'.
 */
export function buildSegments(text, flags = [], links = []) {
  if (!text) {
    return [];
  }
  const ranges = [
    ...links.map((link) => ({ start: link.start, end: link.end, kind: 'link' })),
    ...flags.flatMap((flag) => (flag.evidence ?? []).map((range) => ({ ...range, kind: 'flag' }))),
  ].filter((range) => isValidRange(range, text.length));

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments = [];
  let position = 0;
  for (const range of ranges) {
    if (range.start < position) {
      continue; // overlaps a range already highlighted
    }
    if (range.start > position) {
      segments.push({ text: text.slice(position, range.start), kind: null });
    }
    segments.push({ text: text.slice(range.start, range.end), kind: range.kind });
    position = range.end;
  }
  if (position < text.length) {
    segments.push({ text: text.slice(position), kind: null });
  }
  return segments;
}

/** The link text split around its fake part ("sbi-kyc-update"), for the marked <s> in The link. */
export function splitLinkText(link) {
  const text = link.text ?? '';
  const mark = link.highlight;
  if (!isValidRange(mark, text.length)) {
    return { before: text, marked: '', after: '' };
  }
  return { before: text.slice(0, mark.start), marked: text.slice(mark.start, mark.end), after: text.slice(mark.end) };
}
