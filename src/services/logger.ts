import { doc, setDoc, deleteDoc, getDocs, collection, query, orderBy, limit, onSnapshot, writeBatch, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { SystemLogEntry, SystemLogLevel, SystemLogCategory, SystemLogContext } from '../types';

export interface CaptureOptions {
  level?: SystemLogLevel;
  category?: SystemLogCategory;
  componentStack?: string;
  context?: Partial<SystemLogContext>;
}

const OFFLINE_QUEUE_KEY = 'notx_offline_system_logs';
const DEDUPE_WINDOW_MS = 30000; // 30 seconds
const recentErrorsMap = new Map<string, { timestamp: number; hitCount: number }>();

/**
 * Resolves current application runtime context safely across mobile & web environments.
 */
function resolveCurrentContext(extra?: Partial<SystemLogContext>): SystemLogContext {
  let activeTenantId = '';
  try {
    activeTenantId = localStorage.getItem('notx_active_tenant') || '';
    if (!activeTenantId && typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && !['superadmin', 'verify', 'home', 'events', 'gallery', 'profile'].includes(parts[0])) {
        activeTenantId = parts[0];
      }
    }
  } catch (_) {}

  const curUser = auth.currentUser;

  return {
    tenantId: extra?.tenantId || activeTenantId || 'global',
    userId: extra?.userId || curUser?.uid,
    userEmail: extra?.userEmail || curUser?.email || undefined,
    userRole: extra?.userRole,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'NodeJS/SSR',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    platform: typeof navigator !== 'undefined' ? (navigator as any).platform || 'Unknown' : 'Unknown',
    appVersion: '1.3.0',
    ...extra
  };
}

/**
 * Generates an error fingerprint to prevent infinite-loop flood attacks.
 */
function getErrorFingerprint(message: string, stack?: string): string {
  const head = message || '';
  const firstStackLine = (stack || '').split('\n')[1] || '';
  return `${head}::${firstStackLine.trim()}`;
}

/**
 * Flushes any pending logs queued while the client was offline.
 */
export async function flushOfflineLogs(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;

    const queuedLogs: SystemLogEntry[] = JSON.parse(raw);
    if (!Array.isArray(queuedLogs) || queuedLogs.length === 0) return;

    localStorage.removeItem(OFFLINE_QUEUE_KEY);

    let batch = writeBatch(db);
    let count = 0;

    for (const entry of queuedLogs) {
      batch.set(doc(db, 'system_logs', entry.logId), entry, { merge: true });
      count++;
      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('[Logger] Failed to flush offline logs:', err);
  }
}

// Hook offline flush listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushOfflineLogs().catch(() => {});
  });
}

class SystemLogger {
  /**
   * Captures any thrown exception, extracts trace and component hierarchy, and records it to Firestore.
   */
  async captureException(error: unknown, options?: CaptureOptions): Promise<string> {
    const isErrorObj = error instanceof Error;
    const message = isErrorObj ? error.message : String(error);
    const errorName = isErrorObj ? error.name : 'UnknownError';
    const stackTrace = isErrorObj ? error.stack : undefined;
    const level: SystemLogLevel = options?.level || 'error';
    const category: SystemLogCategory = options?.category || 'general';

    // Deduplication check
    const fingerprint = getErrorFingerprint(message, stackTrace);
    const now = Date.now();
    const existing = recentErrorsMap.get(fingerprint);

    if (existing && now - existing.timestamp < DEDUPE_WINDOW_MS) {
      existing.hitCount += 1;
      return 'throttled';
    }

    recentErrorsMap.set(fingerprint, { timestamp: now, hitCount: 1 });

    const logId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const context = resolveCurrentContext(options?.context);

    const logEntry: SystemLogEntry = {
      logId,
      timestamp: new Date().toISOString(),
      level,
      category,
      message: message || 'Unspecified runtime error',
      errorName,
      stackTrace,
      componentStack: options?.componentStack,
      context,
      hitCount: 1,
      resolved: false
    };

    console.error(`[SystemLogger] [${level.toUpperCase()}] [${category}] ${message}`, {
      logId,
      context,
      error
    });

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.queueOffline(logEntry);
        return logId;
      }

      const logDocRef = doc(db, 'system_logs', logId);
      await setDoc(logDocRef, logEntry);
    } catch (writeErr) {
      console.warn('[SystemLogger] Remote dispatch failed. Buffering offline:', writeErr);
      this.queueOffline(logEntry);
    }

    return logId;
  }

  /**
   * Captures informative or warning diagnostic notices.
   */
  async captureMessage(message: string, level: SystemLogLevel = 'info', options?: CaptureOptions): Promise<string> {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const context = resolveCurrentContext(options?.context);

    const logEntry: SystemLogEntry = {
      logId,
      timestamp: new Date().toISOString(),
      level,
      category: options?.category || 'general',
      message,
      context,
      hitCount: 1,
      resolved: false
    };

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.queueOffline(logEntry);
        return logId;
      }

      await setDoc(doc(db, 'system_logs', logId), logEntry);
    } catch (_) {
      this.queueOffline(logEntry);
    }

    return logId;
  }

  private queueOffline(entry: SystemLogEntry) {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue: SystemLogEntry[] = raw ? JSON.parse(raw) : [];
      queue.push(entry);
      // Keep queue bounded to last 50 items
      if (queue.length > 50) queue.shift();
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (_) {}
  }
}

export const logger = new SystemLogger();

/**
 * Real-time subscription to System Logs for Super Admin console.
 */
export function subscribeToSystemLogs(
  callback: (logs: SystemLogEntry[]) => void,
  limitCount = 100
): () => void {
  const q = query(
    collection(db, 'system_logs'),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: SystemLogEntry[] = [];
      snapshot.forEach((d) => logs.push(d.data() as SystemLogEntry));
      callback(logs);
    },
    (err) => {
      console.warn('[Logger] Subscription warning:', err?.message);
      callback([]);
    }
  );
}

/**
 * Marks a crash log as investigated/resolved.
 */
export async function updateLogResolvedStatus(logId: string, resolved: boolean): Promise<void> {
  await setDoc(doc(db, 'system_logs', logId), { resolved }, { merge: true });
}

/**
 * Purges old system logs from Firestore.
 */
export async function purgeSystemLogs(olderThanDays = 14): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const snap = await getDocs(query(collection(db, 'system_logs'), where('timestamp', '<', cutoff)));

  if (snap.empty) return 0;

  let batch = writeBatch(db);
  let count = 0;
  let totalDeleted = 0;

  for (const d of snap.docs) {
    batch.delete(doc(db, 'system_logs', d.id));
    count++;
    totalDeleted++;
    if (count === 400) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  return totalDeleted;
}
