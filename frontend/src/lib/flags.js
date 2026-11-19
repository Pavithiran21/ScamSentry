/**
 * The grey line under a flag: the API's detail, or else the matched words from the message,
 * quoted ("“will be BLOCKED today”, “immediately”"). Null when there is neither.
 */
export function flagDetail(flag, text) {
  if (flag.detail) {
    return flag.detail;
  }
  if (!text) {
    return null;
  }
  const quotes = (flag.evidence ?? [])
    .filter((range) => isValidRange(range, text.length))
    .slice(0, 2)
    .map((range) => `“${text.slice(range.start, range.end)}”`);
  return quotes.length > 0 ? quotes.join(', ') : null;
}

export function isValidRange(range, length) {
  return (
    Number.isInteger(range?.start) &&
    Number.isInteger(range?.end) &&
    range.start >= 0 &&
    range.end <= length &&
    range.start < range.end
  );
}
