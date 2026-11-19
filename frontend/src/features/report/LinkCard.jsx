import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { splitLinkText } from '../../lib/highlight';
import { linkNote, linkStatusInfo } from '../../lib/linkStatus';

/**
 * One link from the message: its text with the fake part marked ("sbi-kyc-update"), the API's
 * notes, a status tag and Copy link text. It is never a clickable link.
 */
export function LinkCard({ link, canCopy = true }) {
  const { before, marked, after } = splitLinkText(link);
  const status = linkStatusInfo(link.status);
  const note = linkNote(link);
  return (
    <div className="domain">
      <code>
        {before}
        {marked && <s>{marked}</s>}
        {after}
      </code>
      {note && <div className="muted mt-1 text-sm">{note}</div>}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className={`tag ${status.tag}`}>
          <status.Icon aria-hidden="true" /> {status.label}
        </span>
        {canCopy && <CopyButton text={link.text} />}
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // The browser refused the clipboard (an old browser or no permission): nothing to do.
    }
  }

  return (
    <>
      <button type="button" className="btn btn-line sm" onClick={copy}>
        {copied ? <IconCheck aria-hidden="true" /> : <IconCopy aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy link text'}
      </button>
      <span className="sr" aria-live="polite">
        {copied ? 'Link text copied' : ''}
      </span>
    </>
  );
}
