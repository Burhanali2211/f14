/**
 * Shared constants for AirSend P2P file transfer.
 * Used by AirSendDialog, AirSendMobilePage, and airsend-p2p.
 */

export const AIRSEND_ROUTE = '/airsend';

export const AIRSEND_SESSION_EXPIRY_MINUTES = 30;

export function getAirSendUrl(sessionCode: string): string {
  return `${typeof window !== 'undefined' ? window.location.origin : ''}${AIRSEND_ROUTE}?session=${sessionCode}`;
}
