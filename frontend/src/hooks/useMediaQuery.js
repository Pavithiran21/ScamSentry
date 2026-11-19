import { useSyncExternalStore } from 'react';

/** True while the CSS media query matches, for example useMediaQuery(PHONE_QUERY). */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

/** Below 860 px the tabs move into the menu sheet and two-pane pages become separate screens. */
export const NARROW_QUERY = '(max-width: 859.98px)';
