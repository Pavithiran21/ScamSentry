// One place for the TanStack Query keys, so invalidation after a change hits every screen that
// shows the data. Keys start with the resource name: invalidating ['checks'] refreshes History,
// Recent checks and every saved check at once.
export const queryKeys = {
  me: ['me'],
  // Keyed by who is asking (null for a guest): Check stays mounted across sign-in and sign-out.
  quota: (userId) => ['quota', userId ?? 'guest'],
  quotaAll: ['quota'],
  checks: ['checks'],
  checkList: (page, size) => ['checks', 'list', { page, size }],
  check: (id) => ['checks', 'detail', id],
  reports: ['reports'],
  reportList: (page) => ['reports', 'list', { page }],
  report: (id) => ['reports', 'detail', id],
  moderation: ['moderation'],
  modSummary: ['moderation', 'summary'],
  modQueue: (status, sort, page) => ['moderation', 'queue', { status, sort, page }],
  modReport: (id) => ['moderation', 'detail', id],
  demoAccounts: ['demo', 'accounts'],
};
