/**
 * Shared constants for AirSend P2P file transfer.
 * Used by AirSendDialog, AirSendMobilePage, and airsend-p2p.
 */

export const AIRSEND_ROUTE = '/airsend';

export const AIRSEND_SESSION_EXPIRY_MINUTES = 30;

export const AIRSEND_SESSION_STORAGE_KEY = 'airsend_active_session';

export interface StoredAirSendSession {
  sessionCode: string;
  pieceId: string | null;
  createdAt: string;
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
