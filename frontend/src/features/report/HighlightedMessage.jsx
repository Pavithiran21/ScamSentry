import { buildSegments } from '../../lib/highlight';

/**
 * The message with the evidence marked (UI-UX "Real elements behind the sample"): <mark> parts
 * built from the API's start and end offsets, rendered by React as text, never as HTML. A link
 * inside the message is plain <code> text inside its mark, never an <a>, so it can't be opened
 * by accident.
 */
export function HighlightedMessage({ text, flags, links, verdict, className = '' }) {
  const segments = buildSegments(text, flags, links);
  return (
    <div className={`msg m-${verdict} ${className}`}>
      {segments.map((segment, index) => {
        if (segment.kind === 'link') {
          return (
            <mark key={index} className="u">
              <code>{segment.text}</code>
            </mark>
          );
        }
        if (segment.kind === 'flag') {
          return <mark key={index}>{segment.text}</mark>;
        }
        return <span key={index}>{segment.text}</span>;
      })}
    </div>
  );
}
