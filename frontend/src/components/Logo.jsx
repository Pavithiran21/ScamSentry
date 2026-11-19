import { useId } from 'react';
import { Link } from 'react-router';

/**
 * The ScamSentry mark (UI-UX.md "Brand"): a brushed-copper shield with a bevelled rim around a
 * charcoal core. Radar rings and a copper sweep scan inside; a raised lens over a message bubble
 * shows a red alert mark. The gradient ids get a per-instance prefix, because two logos on one
 * page would otherwise share (and fight over) the same ids.
 */
export function LogoMark({ size = 34 }) {
  const id = useId().replace(/:/g, '');
  const copper = `${id}-copper`;
  const char = `${id}-char`;
  const sheen = `${id}-sheen`;
  const sweep = `${id}-sweep`;
  const drop = `${id}-drop`;
  const inner = `${id}-inner`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={copper} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6c9a5" />
          <stop offset=".35" stopColor="#d98b55" />
          <stop offset=".7" stopColor="#a85a2b" />
          <stop offset="1" stopColor="#6e3615" />
        </linearGradient>
        <linearGradient id={char} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a3d45" />
          <stop offset="1" stopColor="#121316" />
        </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".25" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={sweep} cx="0" cy="0" r="1">
          <stop offset="0" stopColor="#f0b98f" stopOpacity=".55" />
          <stop offset="1" stopColor="#f0b98f" stopOpacity="0" />
        </radialGradient>
        <filter id={drop} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#000" floodOpacity=".4" />
        </filter>
        <clipPath id={inner}>
          <path d="M32 8.5l19.5 6.4V30c0 13-8.6 22.2-19.5 26.4C21.1 52.2 12.5 43 12.5 30V14.9z" />
        </clipPath>
      </defs>
      <path d="M32 2.5l25.5 8.4V30c0 17-11 28.5-25.5 33.5C17.5 58.5 6.5 47 6.5 30V10.9z" fill={`url(#${copper})`} />
      <path d="M32 2.5l25.5 8.4V22H6.5V10.9z" fill={`url(#${sheen})`} />
      <path d="M32 8.5l19.5 6.4V30c0 13-8.6 22.2-19.5 26.4C21.1 52.2 12.5 43 12.5 30V14.9z" fill={`url(#${char})`} />
      <g clipPath={`url(#${inner})`}>
        <g fill="none" stroke="#e9a77a" strokeOpacity=".28" strokeWidth="1">
          <circle cx="32" cy="32" r="8" />
          <circle cx="32" cy="32" r="15" />
          <circle cx="32" cy="32" r="22" />
        </g>
        <path d="M32 32L32 6A26 26 0 0 1 54 18z" fill={`url(#${sweep})`} />
      </g>
      <path
        d="M18.5 23h17a2.6 2.6 0 0 1 2.6 2.6v8.8a2.6 2.6 0 0 1-2.6 2.6H27l-5 4.2V37h-3.5a2.6 2.6 0 0 1-2.6-2.6v-8.8a2.6 2.6 0 0 1 2.6-2.6z"
        fill="#f4efe9"
      />
      <g stroke="#8d877e" strokeWidth="2" strokeLinecap="round">
        <path d="M20.5 28h10M20.5 32h7" />
      </g>
      <g filter={`url(#${drop})`}>
        <circle cx="37.5" cy="34.5" r="7.2" fill="#fff" stroke={`url(#${copper})`} strokeWidth="3" />
        <path d="M42.7 39.7l5.4 5.4" stroke={`url(#${copper})`} strokeWidth="4" strokeLinecap="round" />
        <path d="M37.5 31v4.2" stroke="#b8232f" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="37.5" cy="38.3" r="1.5" fill="#b8232f" />
      </g>
    </svg>
  );
}

/** The mark and the wordmark, linking to the role's start page. */
export function Logo({ to = '/', size = 34 }) {
  return (
    <Link className="logo" to={to}>
      <LogoMark size={size} />
      ScamSentry
    </Link>
  );
}
