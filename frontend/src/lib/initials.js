/** "AR" from arjun@example.test: the first two letters or digits of the email's name part. */
export function initialsOf(email = '') {
  const letters = email.split('@')[0].replace(/[^a-z0-9]/gi, '');
  return (letters.slice(0, 2) || '?').toUpperCase();
}
