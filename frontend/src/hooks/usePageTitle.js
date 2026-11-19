import { useEffect } from 'react';

/** "History · ScamSentry" in the browser tab. Never put message text in a title. */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ScamSentry` : 'ScamSentry: is this message a scam?';
  }, [title]);
}
