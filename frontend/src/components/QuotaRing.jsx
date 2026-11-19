// The quota rings (UI-UX.md "Daily limits"). One rule everywhere: the ring shows what is LEFT,
// so it empties as checks are used and is empty at the limit.
const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function arcLength(remaining, limit) {
  if (!limit || remaining <= 0) {
    return 0;
  }
  return (Math.min(remaining, limit) / limit) * CIRCUMFERENCE;
}

function Arc({ remaining, limit }) {
  const length = arcLength(remaining, limit);
  if (length === 0) {
    return null;
  }
  return (
    <circle
      cx="18"
      cy="18"
      r={RADIUS}
      fill="none"
      stroke="#a85a2b"
      strokeWidth="4"
      strokeDasharray={`${length.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
      strokeLinecap="round"
      transform="rotate(-90 18 18)"
    />
  );
}

/** The small ring beside "1 of 3 free checks left today". Decorative: the text says it. */
export function QuotaRing({ remaining, limit }) {
  return (
    <svg className="qring" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <circle cx="18" cy="18" r={RADIUS} fill="none" stroke="#e6e2dc" strokeWidth="4" />
      <Arc remaining={remaining} limit={limit} />
    </svg>
  );
}

/** The large ring with the number in the middle, on a limit card. */
export function BigQuotaRing({ remaining, limit, label }) {
  return (
    <svg className="bigring" width="76" height="76" viewBox="0 0 36 36" role="img" aria-label={label}>
      <circle cx="18" cy="18" r={RADIUS} fill="none" stroke="#e6e2dc" strokeWidth="4" />
      <Arc remaining={remaining} limit={limit} />
      <text x="18" y="22.5" textAnchor="middle" fontFamily="Outfit" fontWeight="800" fontSize="12" fill="#17181c">
        {Math.max(0, remaining)}
      </text>
    </svg>
  );
}
