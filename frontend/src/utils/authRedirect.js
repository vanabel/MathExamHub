/** Build safe post-login redirect paths (same-origin, in-app only). */

export function sanitizeRedirectPath(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '';
  if (trimmed.startsWith('/login') || trimmed.startsWith('/register')) return '';
  return trimmed;
}

export function loginUrlWithRedirect(path) {
  const safe = sanitizeRedirectPath(path) || '/question-list';
  return `/login?redirect=${encodeURIComponent(safe)}`;
}
