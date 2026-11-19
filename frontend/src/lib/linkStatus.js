import { IconAlertTriangle, IconBan, IconCircleCheck, IconShieldCheck } from '@tabler/icons-react';

// The four link statuses from the API (UI-UX.md "Link status and verdict source").
const LINK_STATUS = {
  risky: { label: "Don't open", tag: 't-scam', Icon: IconBan },
  cant_verify: { label: "Can't verify", tag: 't-sus', Icon: IconAlertTriangle },
  official: { label: 'Official site', tag: 't-safe', Icon: IconShieldCheck },
  no_issues: { label: 'No issues found', tag: 't-gray', Icon: IconCircleCheck },
};

export function linkStatusInfo(status) {
  return LINK_STATUS[status] ?? LINK_STATUS.cant_verify;
}

/** The note under a link: the API's notes joined with " · ", or the no-issues sentence. */
export function linkNote(link) {
  const notes = link.notes ?? [];
  if (notes.length > 0) {
    return notes.join(' · ');
  }
  if (link.status === 'no_issues') {
    return "Nothing unusual in the address. We can't vouch for the site itself.";
  }
  return null;
}

function plural(count, one, many) {
  return count === 1 ? one : many;
}

/** "1 risky link", "2 links we can't verify", "1 official link" or "no links" for the risk line. */
export function linkSummary(links) {
  if (!links || links.length === 0) {
    return 'no links';
  }
  const count = (status) => links.filter((link) => link.status === status).length;
  const risky = count('risky');
  const unverified = count('cant_verify');
  const official = count('official');
  if (risky > 0) {
    return `${risky} risky ${plural(risky, 'link', 'links')}`;
  }
  if (unverified > 0) {
    return `${unverified} ${plural(unverified, "link we can't verify", "links we can't verify")}`;
  }
  if (official > 0) {
    return `${official} official ${plural(official, 'link', 'links')}`;
  }
  return `${links.length} ${plural(links.length, 'link', 'links')}, no issues found`;
}
