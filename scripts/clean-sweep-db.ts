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
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

async function cleanSweep() {
  console.log('\n==================================================');
  console.log('       STARTING COMPLETE DATABASE CLEAN SWEEP     ');
  console.log('==================================================\n');

  // Collections to wipe completely (all documents are test/stale)
  const collectionsToWipe = [
    'events',
    'registrations',
    'certificates',
    'event_winners',
    'announcements',
    'albums',
    'support_tickets',
    'notifications',
    'deleted_backups',
    'audit_logs'
  ];

  for (const col of collectionsToWipe) {
    const snap = await getDocs(collection(db, col));
    if (snap.empty) {
      console.log(`[${col}]: 0 docs to delete.`);
      continue;
    }
    console.log(`[${col}]: Deleting ${snap.size} documents...`);
    let batch = writeBatch(db);
    let count = 0;
    let totalDeleted = 0;

    for (const d of snap.docs) {
      batch.delete(doc(db, col, d.id));
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
    console.log(`[${col}]: Successfully deleted ${totalDeleted} documents.`);
  }

  // Clean tenants: remove test scale tenants
  const tenantsSnap = await getDocs(collection(db, 'tenants'));
  console.log(`\n[tenants]: Evaluating ${tenantsSnap.size} tenants...`);
  for (const d of tenantsSnap.docs) {
    const data = d.data();
    // Delete any test tenant
    if (d.id.startsWith('t_') || d.id.startsWith('tenant_') || d.id.includes('scale') || d.id === 'aura-ml' || d.id === 'votas-aitk' || d.id === 'eee-aits') {
      console.log(`   Deleting test tenant: ${d.id}`);
      let b = writeBatch(db);
      b.delete(doc(db, 'tenants', d.id));
      await b.commit();
    } else {
      console.log(`   Preserving non-test tenant: ${d.id} (${data.name})`);
    }
  }

  // Clean users: keep root Super Admin and authorized superadmins
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`\n[users]: Evaluating ${usersSnap.size} users...`);
  let userBatch = writeBatch(db);
  let userCount = 0;
  let usersDeleted = 0;
  for (const d of usersSnap.docs) {
    const data = d.data();
    const isSuper = data.isSuperAdmin ||
      d.id === 'PBQ3Z0T4I6QNMyH9WAYfsBzZgGJ2' ||
      d.id.startsWith('superadmin_') ||
      (data.email && (data.email.toLowerCase() === 'syedsaadullah623@gmail.com' || data.email.toLowerCase() === 'syedsame2244@gmail.com'));

    if (isSuper) {
      console.log(`   Preserving Root Super Admin: ${d.id} (${data.name || data.email})`);
      continue;
    }
    userBatch.delete(doc(db, 'users', d.id));
    userCount++;
    usersDeleted++;
    if (userCount === 400) {
      await userBatch.commit();
      userBatch = writeBatch(db);
      userCount = 0;
    }
  }
  if (userCount > 0) {
    await userBatch.commit();
  }
  console.log(`[users]: Deleted ${usersDeleted} test user accounts.`);

  // Clean appSettings: remove orphaned test tenant configurations
  const settingsSnap = await getDocs(collection(db, 'appSettings'));
  console.log(`\n[appSettings]: Evaluating ${settingsSnap.size} settings docs...`);
  const keepSettings = new Set(['platform_developers', 'seed_status', 'config_cse-aiml']);
  for (const d of settingsSnap.docs) {
    if (keepSettings.has(d.id)) {
      console.log(`   Preserving system setting: ${d.id}`);
    } else {
      console.log(`   Deleting stale setting: ${d.id}`);
      let b = writeBatch(db);
      b.delete(doc(db, 'appSettings', d.id));
      await b.commit();
    }
  }

  console.log('\n==================================================');
  console.log('          CLEAN SWEEP COMPLETED SUCCESSFULLY       ');
  console.log('==================================================\n');
  process.exit(0);
}

cleanSweep().catch(err => {
  console.error('Clean sweep failed:', err);
  process.exit(1);
});
