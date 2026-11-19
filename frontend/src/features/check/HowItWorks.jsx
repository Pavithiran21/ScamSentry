import { IconClipboardText, IconListCheck, IconRadar2, IconShieldLock } from '@tabler/icons-react';

/** The help column beside the guest check panel: How it works, What we look for, privacy. */
export function HowItWorks() {
  return (
    <aside className="stack" id="how" aria-label="About ScamSentry">
      <div className="card">
        <h2>How it works</h2>
        <ol className="how">
          <li>
            <span className="n" aria-hidden="true">
              <IconClipboardText />
            </span>
            <div>
              <b>Paste it</b>
              <div className="muted">An SMS, WhatsApp message, email or link.</div>
            </div>
          </li>
          <li>
            <span className="n" aria-hidden="true">
              <IconRadar2 />
            </span>
            <div>
              <b>We check it</b>
              <div className="muted">Wording and every link, by fixed rules and an AI check.</div>
            </div>
          </li>
          <li>
            <span className="n" aria-hidden="true">
              <IconListCheck />
            </span>
            <div>
              <b>You get the reasons</b>
              <div className="muted">A verdict, what looked wrong, and what to do next.</div>
            </div>
          </li>
        </ol>
      </div>
      <div className="card">
        <h2>What we look for</h2>
        <div className="look">
          <span>Urgency</span>
          <span>Fake bank or brand</span>
          <span>OTP or money requests</span>
          <span>Lookalike links</span>
          <span>Short links</span>
        </div>
      </div>
      <div className="card privacy" id="privacy">
        <IconShieldLock aria-hidden="true" />
        <div>
          <b>Your text stays private.</b> Guest messages are never stored. Signed-in users choose what to keep.
        </div>
      </div>
    </aside>
  );
}
