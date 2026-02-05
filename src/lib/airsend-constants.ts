/**
 * Shared constants for AirSend P2P file transfer.
 * Used by AirSendDialog, AirSendMobilePage, and airsend-p2p.
 */

export const AIRSEND_ROUTE = '/airsend';

export const AIRSEND_SESSION_EXPIRY_MINUTES = 30;

export const AIRSEND_SESSION_STORAGE_KEY = 'airsend_active_session';

/** Mobile: persist session in storage so refresh/navigation back keeps same session */
export const AIRSEND_MOBILE_SESSION_KEY = 'airsend_mobile_session';

/** Session code length - 8 chars = 32^8 combinations, harder to guess */
export const AIRSEND_SESSION_CODE_LENGTH = 8;

export interface StoredAirSendSession {
  sessionCode: string;
  pieceId: string | null;
  createdAt: string;
}

/** Generate a random session code (excludes ambiguous chars: 0,O,1,I,L) */
export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < AIRSEND_SESSION_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getAirSendUrl(sessionCode: string): string {
  return `${typeof window !== 'undefined' ? window.location.origin : ''}${AIRSEND_ROUTE}?session=${sessionCode}`;
}

export function getStoredSession(): StoredAirSendSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AIRSEND_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAirSendSession;
  } catch {
    return null;
  }
}

export function setStoredSession(session: StoredAirSendSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AIRSEND_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AIRSEND_SESSION_STORAGE_KEY);
}

/** Mobile: store session code so refresh keeps user in same session */
export function setMobileSession(sessionCode: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AIRSEND_MOBILE_SESSION_KEY, sessionCode);
}

export function getMobileSession(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(AIRSEND_MOBILE_SESSION_KEY);
}

export function clearMobileSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AIRSEND_MOBILE_SESSION_KEY);
}
