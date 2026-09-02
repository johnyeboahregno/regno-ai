// Read auth-redirect params so the login page can explain why the user
// landed here and return them to their original destination after signing in.
import type { PageLoad } from './$types.js';

const MESSAGES: Record<string, string> = {
  'sign-in-required': 'This page requires sign-in. Please sign in to continue.',
  'session-expired': 'Your session has expired — please sign in again to continue.',
};

export const load: PageLoad = ({ url }) => {
  const code = url.searchParams.get('error');
  let next = url.searchParams.get('next') ?? '/app';
  // Only allow same-origin relative paths — never protocol-relative or absolute URLs.
  if (!next.startsWith('/') || next.startsWith('//')) next = '/app';

  return {
    error: code ? MESSAGES[code] ?? code : '',
    next,
  };
};
