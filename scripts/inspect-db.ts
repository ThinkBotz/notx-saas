if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  };
}

import { db } from '../src/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function check() {
  const collections = [
    'tenants',
    'users',
    'events',
    'registrations',
    'certificates',
    'event_winners',
    'announcements',
    'albums',
    'support_tickets',
    'audit_logs',
    'deleted_backups',
    'appSettings'
  ];

  console.log('\n==================================================');
  console.log('            LIVE FIRESTORE DATABASE AUDIT         ');
  console.log('==================================================');

  for (const c of collections) {
    try {
      const snap = await getDocs(collection(db, c));
      console.log(`\nCollection: [${c}] -> ${snap.size} documents`);
      snap.forEach(d => {
        const data = d.data();
        const snippet = {
          id: d.id,
          tenantId: data.tenantId,
          name: data.name || data.title || data.studentName || data.action || data.subject,
          role: data.role,
          status: data.status,
          date: data.date || data.createdAt || data.timestamp
        };
        console.log(`   * ${JSON.stringify(snippet)}`);
      });
    } catch (e: any) {
      console.log(`Collection: [${c}] -> Error: ${e.message}`);
    }
  }
  console.log('\n==================================================\n');
  process.exit(0);
}

check();
