import { SessionResponse } from '@/app/core/ao-api/types';

/**
 * Warpgate session end via edge-injected auth headers.
 * POST /@warpgate/api/auth/logout with cookies, then navigate to redirect.
 */
export async function logoutFromSession(
  session: Pick<
    SessionResponse,
    'logoutUrl' | 'logoutMethod' | 'logoutRedirect'
  > | null
    | undefined
): Promise<boolean> {
  const url = session?.logoutUrl?.trim();
  if (!url) return false;
  const method = (session?.logoutMethod || 'POST').toUpperCase();
  const redirect = session?.logoutRedirect?.trim() || '/@warpgate';
  try {
    await fetch(url, { method, credentials: 'include' });
  } catch {
    // Still leave the app; session cookie may already be gone.
  }
  window.location.assign(redirect);
  return true;
}
