/**
 * NOTX SaaS — Authentication, Cryptography & Session Management
 * Provides password hashing, secure verification, legacy migration,
 * and 24-hour inactivity session management.
 */

const PASSWORD_SALT = 'notx_salt_v1:';
export const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_ACTIVITY_KEY = 'notx_last_activity';

/**
 * Hash a password using SHA-256 with a system salt via Web Crypto API.
 */
export async function hashPassword(password: string): Promise<string> {
  const trimmed = password.trim();
  if (!trimmed) return '';
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${PASSWORD_SALT}${trimmed}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for non-crypto environments (should not happen in modern browser)
  let hash = 0;
  const str = `${PASSWORD_SALT}${trimmed}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Determine if a string is already a 64-character SHA-256 hex hash.
 */
export function isHashedPassword(value?: string): boolean {
  if (!value) return false;
  return /^[a-f0-9]{64}$/i.test(value.trim());
}

/**
 * Verify an input password against stored value.
 * Supports legacy plain-text passwords for zero-disruption migration,
 * as well as salted SHA-256 hashes.
 */
export async function verifyPassword(
  inputPassword: string, 
  storedPasswordOrHash?: string
): Promise<{ isValid: boolean; needsRehash: boolean }> {
  if (!storedPasswordOrHash || !inputPassword) {
    return { isValid: false, needsRehash: false };
  }

  const cleanInput = inputPassword.trim();
  const cleanStored = storedPasswordOrHash.trim();

  // 1. Direct match with stored plain text (legacy accounts)
  if (cleanInput === cleanStored) {
    return { isValid: true, needsRehash: true };
  }

  // 2. Hash match
  const inputHash = await hashPassword(cleanInput);
  if (inputHash === cleanStored) {
    return { isValid: true, needsRehash: false };
  }

  return { isValid: false, needsRehash: false };
}

/**
 * Records user activity timestamp for 24-hour inactivity tracking.
 */
export function recordUserActivity(): void {
  try {
    localStorage.setItem(SESSION_ACTIVITY_KEY, Date.now().toString());
  } catch (e) {
    // Ignore localStorage access failures
  }
}

/**
 * Check if the active session has exceeded 24 hours of inactivity.
 */
export function isSessionExpired(): boolean {
  try {
    const lastActivity = localStorage.getItem(SESSION_ACTIVITY_KEY);
    if (!lastActivity) return false;
    const elapsed = Date.now() - parseInt(lastActivity, 10);
    return elapsed > SESSION_TIMEOUT_MS;
  } catch (e) {
    return false;
  }
}

/**
 * Clears user session and activity tracker from localStorage.
 */
export function clearUserSession(): void {
  try {
    localStorage.removeItem('notx_user');
    localStorage.removeItem(SESSION_ACTIVITY_KEY);
    localStorage.removeItem('notx_active_tab');
  } catch (e) {
    // Ignore
  }
}

/**
 * Generates an 8-character verification signature for event tickets
 */
export async function generateTicketSignature(
  regId: string,
  eventId: string,
  roll: string,
  tenantId: string
): Promise<string> {
  const payload = `notx_ticket:${tenantId}:${eventId}:${regId}:${roll}`;
  const fullHash = await hashPassword(payload);
  return fullHash.substring(0, 8).toUpperCase();
}

/**
 * Validates a ticket signature
 */
export async function verifyTicketSignature(
  regId: string,
  eventId: string,
  roll: string,
  tenantId: string,
  sig: string
): Promise<boolean> {
  if (!sig) return false;
  const expected = await generateTicketSignature(regId, eventId, roll, tenantId);
  return expected.toUpperCase() === sig.trim().toUpperCase();
}

