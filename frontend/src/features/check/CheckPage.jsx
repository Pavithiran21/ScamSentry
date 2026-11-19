import { IconAlertCircle, IconDeviceFloppy, IconLock, IconRadar2, IconRefresh } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { runCheck } from '../../api/checks';
import { getQuota } from '../../api/quota';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { QuotaRing } from '../../components/QuotaRing';
import { ErrorPanel, Splash } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { isNetworkError, isSessionEnded } from '../../lib/apiErrors';
import { comeBackWhen, limitKind, quotaSummary } from '../../lib/limits';
import { MAX_MESSAGE_LENGTH, SAMPLE_MESSAGES } from '../../lib/samples';
import { verdictLabel } from '../../lib/verdicts';
import { TopBar } from '../../layout/TopBar';
import { SecurityReport } from '../report/SecurityReport';
import { HowItWorks } from './HowItWorks';
import { LimitCard } from './LimitCard';
import { RecentChecks } from './RecentChecks';

const EMPTY_MESSAGE = 'Paste a message or link to check.';
const numberFormat = new Intl.NumberFormat('en-IN');

/**
 * `/`, the front door (UI-UX "Routes"). A guest gets the charcoal band home with the check panel
 * rising over its edge; a signed-in User gets the top bar, the panel and Recent checks. A
 * Moderator doesn't check messages (the API answers 403), so they go to the review queue.
 */
export function CheckPage() {
  const { user, isLoading } = useAuth();
  usePageTitle(null);
  useScrollToHash();

  if (isLoading) {
    return <Splash />;
  }
  if (user?.role === 'moderator') {
    return <Navigate to="/review" replace />;
  }
  return <CheckWorkspace user={user} />;
}

function CheckWorkspace({ user }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const textareaRef = useRef(null);
  const headingRef = useRef(null);

  const quotaKey = queryKeys.quota(user?.id);
  const quotaQuery = useQuery({ queryKey: quotaKey, queryFn: getQuota });

  const check = useMutation({
    mutationFn: runCheck,
    onSuccess: (data) => {
      // The reply carries today's quota, so the ring updates without another request.
      queryClient.setQueryData(quotaKey, data.quota);
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.checks });
      }
    },
    onError: (error) => {
      if (limitKind(error.code)) {
        queryClient.invalidateQueries({ queryKey: quotaKey }); // for resetAt and the empty ring
      }
      const detail = error.details?.find((item) => item.field === 'text');
      if (error.code === 'VALIDATION_FAILED' && detail) {
        setFieldError(detail.message);
      }
    },
  });

  const result = check.data?.check ?? null;

  // A new report takes focus, so keyboard and screen-reader users land on the verdict.
  useEffect(() => {
    if (result) {
      headingRef.current?.focus();
    }
  }, [result]);

  const summary = quotaSummary(quotaQuery.data);
  const resetAt = quotaQuery.data?.resetAt;
  const atLimit = summary?.remaining === 0;
  const hitLimit = limitKind(check.error?.code) ?? (atLimit && !result ? summary.kind : null);

  function submit(event) {
    event.preventDefault();
    if (!text.trim()) {
      setFieldError(EMPTY_MESSAGE);
      textareaRef.current?.focus();
      return;
    }
    setFieldError(null);
    check.mutate(text);
  }

  function checkAnother() {
    check.reset();
    setText('');
    setFieldError(null);
    textareaRef.current?.focus();
  }

  const panel = (
    <CheckPanel
      signedIn={Boolean(user)}
      text={text}
      onTextChange={(value) => {
        setText(value);
        if (fieldError && value.trim()) {
          setFieldError(null);
        }
      }}
      textareaRef={textareaRef}
      fieldError={fieldError}
      summary={summary}
      resetAt={resetAt}
      atLimit={atLimit}
      busy={check.isPending}
      onSubmit={submit}
    />
  );

  const outcome = (
    <CheckOutcome
      user={user}
      check={check}
      result={result}
      hitLimit={hitLimit}
      quota={quotaQuery.data}
      headingRef={headingRef}
      onRetry={() => check.mutate(text)}
      onCheckAnother={checkAnother}
    />
  );

  // Announces the verdict to screen readers when a report arrives (UI-UX "Announcements").
  const status = (
    <p className="sr" role="status">
      {result ? `Result: ${verdictLabel(result.verdict)}` : ''}
    </p>
  );

  if (!user) {
    return (
      <>
        <div className="band">
          <TopBar variant="guest" inBand />
          <div className="band-in">
            <div className="head">
              <span className="tag">
                <IconLock aria-hidden="true" /> No sign-up · guest messages are never stored
              </span>
              <h1>
                Is this message a <span className="gt">scam?</span>
              </h1>
              <p>Paste an SMS, WhatsApp message, email or link. Get a clear verdict and the reasons in seconds.</p>
            </div>
          </div>
        </div>
        <main className="main over" id="main">
          <div className="grid2 check-grid">
            {panel}
            {outcome}
            <HowItWorks />
          </div>
          {status}
        </main>
      </>
    );
  }

  return (
    <main className="main top" id="main">
      <div className="page-head">
        <h1>Check a message</h1>
        {summary && (
          <span className="quota sp">
            <QuotaRing remaining={summary.remaining} limit={summary.limit} /> {summary.text}
          </span>
        )}
      </div>
      <div className="grid2 check-grid">
        {panel}
        {outcome}
        <RecentChecks />
      </div>
      {status}
    </main>
  );
}

function CheckPanel({
  signedIn,
  text,
  onTextChange,
  textareaRef,
  fieldError,
  summary,
  resetAt,
  atLimit,
  busy,
  onSubmit,
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const countId = `${id}-count`;

  return (
    <form className={fieldError ? 'panel bad' : 'panel'} aria-label="Check a message" onSubmit={onSubmit} noValidate>
      <label className="lbl" htmlFor={id}>
        Message or link
      </label>
      <textarea
        ref={textareaRef}
        id={id}
        className="textarea"
        style={signedIn ? { minHeight: 200 } : undefined}
        placeholder="Paste the message or link here"
        value={text}
        maxLength={MAX_MESSAGE_LENGTH}
        onChange={(event) => onTextChange(event.target.value)}
        aria-invalid={fieldError ? 'true' : undefined}
        aria-describedby={fieldError ? `${errorId} ${countId}` : countId}
      />
      {fieldError && (
        <div className="ferr" id={errorId}>
          <IconAlertCircle aria-hidden="true" /> {fieldError}
        </div>
      )}
      <div className="count" id={countId}>
        {numberFormat.format(text.length)} / {numberFormat.format(MAX_MESSAGE_LENGTH)}
      </div>
      <div className="cp-bar">
        {signedIn ? (
          <span className="hint save-hint mt-0 inline-flex items-center gap-1.5">
            <IconDeviceFloppy aria-hidden="true" /> This check is saved to your History.
          </span>
        ) : (
          summary && (
            <span className="quota">
              <QuotaRing remaining={summary.remaining} limit={summary.limit} />
              {summary.text}
              {atLimit && ` · back ${comeBackWhen(resetAt)}`}
            </span>
          )
        )}
        <button type="submit" className="btn btn-copper" disabled={atLimit || busy}>
          <IconRadar2 aria-hidden="true" /> {busy ? 'Checking…' : 'Check message'}
        </button>
      </div>
      {!signedIn && (
        <div className="samples">
          <span className="lead">Try a sample:</span>
          {SAMPLE_MESSAGES.map((sample) => (
            <button key={sample.label} type="button" className="chip" onClick={() => onTextChange(sample.text)}>
              {sample.label}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

/**
 * What appears under the panel: loading, the report, a limit card, or an error state. It comes
 * right after the panel in the page order, so on a phone it is directly under the box; on a wide
 * screen the grid places it on its own full-width row below the panel and the side column.
 */
function CheckOutcome({ user, check, result, hitLimit, quota, headingRef, onRetry, onCheckAnother }) {
  const error = check.error;
  let content = null;

  if (check.isPending) {
    content = (
      <div className="state" role="status">
        <h3>
          <IconRadar2 className="text-copper-d" aria-hidden="true" /> Scanning the message…
        </h3>
        <div className="muted text-[15px]">Looking at links, wording and patterns.</div>
        <div className="skel w-[55%]" />
        <div className="skel" />
        <div className="skel w-[35%]" />
      </div>
    );
  } else if (result) {
    content = (
      <SecurityReport
        check={result}
        headingRef={headingRef}
        footer={<ReportFooter user={user} result={result} onCheckAnother={onCheckAnother} />}
      />
    );
  } else if (hitLimit) {
    // The limit itself comes from GET /quota, which is reloaded after a 429.
    const limit = quota?.[hitLimit]?.limit;
    content = limit ? <LimitCard kind={hitLimit} limit={limit} resetAt={quota.resetAt} /> : null;
  } else if (error && !isSessionEnded(error) && error.code !== 'VALIDATION_FAILED') {
    content = <CheckError error={error} onRetry={onRetry} />;
  }

  if (!content) {
    return null;
  }
  return (
    <section className="check-outcome" aria-label="Result">
      {content}
    </section>
  );
}

function ReportFooter({ user, result, onCheckAnother }) {
  return (
    <>
      {user ? (
        <span className="muted inline-flex items-center gap-1.5">
          <IconDeviceFloppy aria-hidden="true" /> Saved to your History.{' '}
          {result.id && (
            <Link className="link-c" to={`/history/${result.id}`}>
              Open the saved check
            </Link>
          )}
        </span>
      ) : (
        <span className="muted">
          <IconLock className="inline align-[-2px]" aria-hidden="true" /> Guests can&apos;t report because we don&apos;t
          keep guest messages.{' '}
          <Link className="link-c" to="/signup">
            Sign up
          </Link>{' '}
          to report.
        </span>
      )}
      <button type="button" className="btn btn-copper spacer" onClick={onCheckAnother}>
        <IconRadar2 aria-hidden="true" /> Check another
      </button>
    </>
  );
}

function CheckError({ error, onRetry }) {
  if (error.code === 'TEXT_TOO_LONG' || error.code === 'PAYLOAD_TOO_LARGE') {
    return (
      <div className="state err" role="alert">
        <h3>That&apos;s too long to check</h3>
        <div className="muted text-[15px]">Paste at most 5,000 characters, for example just the message body.</div>
      </div>
    );
  }
  if (error.code === 'CHECKER_UNAVAILABLE') {
    return (
      <div className="state warn" role="alert">
        <h3>Couldn&apos;t check right now</h3>
        <div className="muted mb-3 text-[15px]">
          Our checking service didn&apos;t respond. This didn&apos;t use up a free check; try again in a minute.
        </div>
        <button type="button" className="btn btn-line sm" onClick={onRetry}>
          <IconRefresh aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }
  if (isNetworkError(error)) {
    return (
      <div className="state warn" role="alert">
        <h3>Couldn&apos;t reach ScamSentry</h3>
        <div className="muted mb-3 text-[15px]">Check your connection and try again.</div>
        <button type="button" className="btn btn-line sm" onClick={onRetry}>
          <IconRefresh aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }
  return <ErrorPanel error={error} onRetry={onRetry} />;
}

/** "How it works" and "Privacy" links point at /#how and /#privacy: scroll to them. */
function useScrollToHash() {
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) {
      return;
    }
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ block: 'start' });
  }, [location.hash, location.key]);
}
