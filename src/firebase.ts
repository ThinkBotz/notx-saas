import { initializeApp, getApps as getSecondaryApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as signOutSecondary } from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocFromServer,
  writeBatch,
  onSnapshot,
  limit,
  runTransaction
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  DepartmentEvent, 
  EventRegistration, 
  Album, 
  Announcement, 
  Tenant,
  SUPER_ADMIN_EMAILS,
  UserProfile,
  AssociateMember,
  TeamMember,
  AppConfig,
  SupportInfo,
  DEFAULT_SUPPORT_INFO,
  CertificateTemplate,
  DEFAULT_CERTIFICATE_TEMPLATE,
  IssuedCertificate,
  EventWinner,
  AppBranding,
  DEFAULT_BRANDING,
  PlatformDevConfig,
  DEFAULT_PLATFORM_DEV_CONFIG,
  AuditLogEntry,
  DeletedBackup,
  AuditActor,
  AuditAction,
  SupportTicket,
  TicketReply,
  TicketCategory,
  TicketStatus,
  AppNotification,
  AdminAuthRecord
} from './types';
import { hashPassword } from './utils/auth';


const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const auth = getAuth(app);

// ---------------- MULTI-TENANT SAAS ARCHITECTURE ----------------
export const DEFAULT_TENANT_ID = 'cse-aiml';

export const INITIAL_TENANT: Tenant = {
  tenantId: 'cse-aiml',
  name: 'CSE (AI & ML) Department',
  shortCode: 'AIML',
  adminEmail: 'syedsame2244@gmail.com',
  institution: 'Annamacharya Institute of Tech & Sciences',
  status: 'active',
  branding: DEFAULT_BRANDING,
  supportInfo: DEFAULT_SUPPORT_INFO,
  createdAt: new Date().toISOString()
};

export async function getAllTenants(): Promise<Tenant[]> {
  try {
    const snap = await getDocs(collection(db, 'tenants'));
    const list: Tenant[] = [];
    snap.forEach((d) => list.push(d.data() as Tenant));
    return list;
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return [];
  }
}

export function subscribeToTenants(callback: (tenants: Tenant[]) => void): () => void {
  try {
    return onSnapshot(collection(db, 'tenants'), (snapshot) => {
      const list: Tenant[] = [];
      snapshot.forEach((d) => list.push(d.data() as Tenant));
      callback(list);
    }, (error) => {
      console.error("Error subscribing to tenants:", error);
      callback([]);
    });
  } catch {
    return () => {};
  }
}

export async function getTenant(tenantId?: string): Promise<Tenant | null> {
  if (!tenantId || !tenantId.trim()) return null;
  const cleanId = tenantId.trim().toLowerCase();
  try {
    const docRef = doc(db, 'tenants', cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Tenant;
    }
    return null;
  } catch {
    return null;
  }
}

export async function createAdminAuthAccount(
  email: string,
  password: string
): Promise<{ uid?: string; error?: string }> {
  try {
    const existingApps = getSecondaryApps();
    const appName = "SecondaryAdminAuthApp";
    const secApp = existingApps.find(a => a.name === appName) || initializeApp(firebaseConfig, appName);
    const secAuth = getAuth(secApp);
    
    const userCredential = await createUserWithEmailAndPassword(secAuth, email.trim().toLowerCase(), password);
    await signOutSecondary(secAuth);
    return { uid: userCredential.user.uid };
  } catch (error: any) {
    if (error?.code === 'auth/email-already-in-use') {
      return { error: 'Email already registered in Firebase Auth' };
    }
    console.warn("Secondary admin auth account registration note:", error?.message);
    return { error: error?.message };
  }
}

export async function fetchAdminAuthRecord(email: string): Promise<AdminAuthRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  try {
    const snap = await getDoc(doc(db, 'admin_auth', cleanEmail));
    if (snap.exists()) {
      return snap.data() as AdminAuthRecord;
    }
    return null;
  } catch (err) {
    console.warn('fetchAdminAuthRecord note:', err);
    return null;
  }
}

export async function createOrUpdateAdminAuthRecord(record: Partial<AdminAuthRecord> & { email: string }): Promise<void> {
  const cleanEmail = record.email.trim().toLowerCase();
  try {
    await setDoc(doc(db, 'admin_auth', cleanEmail), cleanUndefined({
      ...record,
      id: cleanEmail,
      email: cleanEmail,
      updated_at: record.updated_at || new Date().toISOString()
    }), { merge: true });
  } catch (err) {
    console.error('Failed to save admin auth record:', err);
  }
}

export async function deleteAdminAuthRecord(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    await deleteDoc(doc(db, 'admin_auth', cleanEmail));
  } catch (err) {
    console.warn('Failed to delete admin auth record:', err);
  }
}

export async function seedAdminAuthIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, 'admin_auth');
    const snap = await getDocs(query(colRef, limit(1)));
    if (snap.empty) {
      // Seed default Super Admin
      for (const superEmail of SUPER_ADMIN_EMAILS) {
        const clean = superEmail.trim().toLowerCase();
        await setDoc(doc(db, 'admin_auth', clean), {
          id: clean,
          email: clean,
          role: 'superadmin',
          tenantId: '',
          name: 'Super Administrator',
          status: 'active',
          created_at: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('seedAdminAuthIfEmpty note:', err);
  }
}

export async function resetTenantAdminPassword(
  tenantId: string,
  adminEmail: string,
  newPassword: string
): Promise<void> {
  const cleanId = tenantId.trim().toLowerCase();
  const cleanEmail = adminEmail.trim().toLowerCase();
  const passHash = await hashPassword(newPassword);

  // 1. Update admin_auth record
  await setDoc(doc(db, 'admin_auth', cleanEmail), cleanUndefined({
    id: cleanEmail,
    email: cleanEmail,
    role: 'admin',
    tenantId: cleanId,
    passwordHash: passHash,
    status: 'active',
    updated_at: new Date().toISOString()
  }), { merge: true });

  // 2. Update tenant document directly
  await updateDoc(doc(db, 'tenants', cleanId), {
    adminPasswordHash: passHash
  }).catch(err => console.warn('Tenant doc password sync notice:', err));

  // 3. Update user profile password hash in users collection
  const q = query(collection(db, 'users'), where('tenantId', '==', cleanId));
  const snap = await getDocs(q);
  for (const uDoc of snap.docs) {
    const uData = uDoc.data() as UserProfile;
    if (uData.email?.toLowerCase() === cleanEmail || uData.role === 'admin') {
      await updateDoc(doc(db, 'users', uDoc.id), {
        password: passHash
      });
    }
  }

  // 4. Attempt secondary account creation if account doesn't exist in Firebase Auth yet
  await createAdminAuthAccount(cleanEmail, newPassword).catch(() => {});

  // 5. Log audit entry
  await writeAuditLog({
    action: 'admin.password_reset',
    tenantId: cleanId,
    entityType: 'tenant',
    entityId: cleanId,
    entityName: cleanEmail,
    details: `Superadmin updated administrative password credentials for ${cleanEmail} (${cleanId}).`,
    severity: 'warning'
  });
}

export async function createTenant(tenant: Tenant, initialAdminPassword?: string): Promise<void> {
  const cleanId = tenant.tenantId.trim().toLowerCase();
  const path = `tenants/${cleanId}`;
  try {
    const cleanAdminEmail = tenant.adminEmail.trim().toLowerCase();

    // Optional password hash
    let passwordHash = '';
    if (initialAdminPassword && initialAdminPassword.trim()) {
      passwordHash = await hashPassword(initialAdminPassword.trim());
      // Provision Firebase Auth account in secondary instance
      await createAdminAuthAccount(cleanAdminEmail, initialAdminPassword.trim()).catch(() => {});
    }

    const finalTenant: Tenant = {
      ...tenant,
      tenantId: cleanId,
      adminEmail: cleanAdminEmail,
      adminPasswordHash: passwordHash || undefined,
      status: tenant.status || 'active',
      branding: tenant.branding || {
        ...DEFAULT_BRANDING,
        appName: 'NOTX',
        tagline: 'Connect',
        subtitle: tenant.shortCode || tenant.name
      },
      supportInfo: tenant.supportInfo || DEFAULT_SUPPORT_INFO,
      createdAt: tenant.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, 'tenants', cleanId), cleanUndefined(finalTenant));

    // Provision default tenant admin user profile in Firestore
    const adminUid = `admin_${cleanId}_${Date.now()}`;
    const adminUser: UserProfile = {
      uid: adminUid,
      name: `${tenant.shortCode || tenant.name} Admin`,
      email: cleanAdminEmail,
      googleEmail: cleanAdminEmail,
      role: 'admin',
      tenantId: cleanId,
      position: 'Department Admin',
      department: tenant.name,
      responsibilities: `Administrative control for ${tenant.name}`,
      password: passwordHash || undefined,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', adminUid), cleanUndefined(adminUser));

    // Register into protected admin_auth collection
    await setDoc(doc(db, 'admin_auth', cleanAdminEmail), cleanUndefined({
      id: cleanAdminEmail,
      email: cleanAdminEmail,
      role: 'admin',
      tenantId: cleanId,
      name: adminUser.name,
      passwordHash: passwordHash || undefined,
      status: 'active',
      created_at: new Date().toISOString()
    }));

    // Initialize tenant-scoped app configuration with initial branding & settings
    const configDocId = `config_${cleanId}`;
    const initialConfig: AppConfig = {
      isCertificatesEnabled: true,
      certificateTemplate: DEFAULT_CERTIFICATE_TEMPLATE,
      supportInfo: finalTenant.supportInfo || DEFAULT_SUPPORT_INFO,
      branding: finalTenant.branding || DEFAULT_BRANDING,
      tenantId: cleanId
    };
    await setDoc(doc(db, 'appSettings', configDocId), cleanUndefined(initialConfig));

    await writeAuditLog({
      action: 'tenant.create',
      tenantId: cleanId,
      entityType: 'tenant',
      entityId: cleanId,
      entityName: finalTenant.name,
      details: `Provisioned new multi-tenant organization "${finalTenant.name}" (${cleanId}) with Admin: ${cleanAdminEmail}.`,
      severity: 'warning'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}


/**
 * Automatically transfers tenant admin ownership:
 * - Finds and removes previous/stray admin profiles belonging to this tenant whose email does not match newAdminEmail.
 * - Promotes or provisions the new admin profile in Firestore so user count is always 1:1.
 */
export async function transferTenantAdminOwnership(
  tenantId: string,
  newAdminEmail: string,
  deptName?: string
): Promise<void> {
  const cleanId = tenantId.trim().toLowerCase();
  const cleanNewEmail = newAdminEmail.trim().toLowerCase();

  try {
    // 1. Fetch all users for this tenant
    const q = query(collection(db, 'users'), where('tenantId', '==', cleanId));
    const usersSnap = await getDocs(q);
    let newAdminProfileFound = false;

    for (const userDoc of usersSnap.docs) {
      const u = userDoc.data() as UserProfile;
      const userEmail = (u.email || '').trim().toLowerCase();
      const userGoogleEmail = (u.googleEmail || '').trim().toLowerCase();

      if (userEmail === cleanNewEmail || userGoogleEmail === cleanNewEmail) {
        newAdminProfileFound = true;
        // Ensure role is admin
        if (u.role !== 'admin') {
          await updateDoc(doc(db, 'users', userDoc.id), {
            role: 'admin',
            position: 'Department Administrator',
            responsibilities: `Administrative access for ${deptName || cleanId.toUpperCase()}`
          });
        }
      } else if (u.role === 'admin') {
        // Stale or previous admin found for this tenant! Remove their profile completely
        console.log(`[Ownership Transfer] Removing previous admin user profile: ${u.uid} (${u.email}) from tenant: ${cleanId}`);
        await deleteDoc(doc(db, 'users', userDoc.id));
        if (u.email) {
          await deleteAdminAuthRecord(u.email);
        }
      }
    }

    // 2. If no profile exists for the new admin yet, create a clean placeholder profile
    if (!newAdminProfileFound) {
      const adminUid = `admin_${cleanId}_${Date.now()}`;
      const newAdminUser: UserProfile = {
        uid: adminUid,
        name: `${deptName || cleanId.toUpperCase()} Admin`,
        email: cleanNewEmail,
        googleEmail: cleanNewEmail,
        role: 'admin',
        tenantId: cleanId,
        position: 'Department Administrator',
        department: deptName || cleanId.toUpperCase(),
        responsibilities: `Administrative control for ${deptName || cleanId.toUpperCase()}`,
        created_at: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', adminUid), cleanUndefined(newAdminUser));
    }

    // 3. Ensure admin_auth document is active
    await setDoc(doc(db, 'admin_auth', cleanNewEmail), cleanUndefined({
      id: cleanNewEmail,
      email: cleanNewEmail,
      role: 'admin',
      tenantId: cleanId,
      name: `${deptName || cleanId.toUpperCase()} Admin`,
      status: 'active',
      updated_at: new Date().toISOString()
    }), { merge: true });
  } catch (err) {
    console.error('[Ownership Transfer Error]:', err);
    throw err;
  }
}

export async function updateTenant(
  tenantId: string, 
  updates: Partial<Tenant>, 
  newAdminPassword?: string
): Promise<void> {
  const cleanId = tenantId.trim().toLowerCase();
  const path = `tenants/${cleanId}`;
  try {
    const tenantDocRef = doc(db, 'tenants', cleanId);
    const prevSnap = await getDoc(tenantDocRef);
    const prevTenant = prevSnap.exists() ? (prevSnap.data() as Tenant) : null;

    await updateDoc(tenantDocRef, cleanUndefined(updates));

    const finalAdminEmail = (updates.adminEmail || prevTenant?.adminEmail || '').trim().toLowerCase();
    if (finalAdminEmail) {
      // Auto ownership transfer: clean up previous admin data & ensure new admin is established
      await transferTenantAdminOwnership(
        cleanId,
        finalAdminEmail,
        updates.shortCode || updates.name || prevTenant?.shortCode || prevTenant?.name || cleanId
      );

      // If new password provided by Superadmin, apply reset
      if (newAdminPassword && newAdminPassword.trim()) {
        await resetTenantAdminPassword(cleanId, finalAdminEmail, newAdminPassword.trim());
      }
    }

    await writeAuditLog({
      action: 'tenant.update',
      tenantId: cleanId,
      entityType: 'tenant',
      entityId: cleanId,
      entityName: updates.name || prevTenant?.name || cleanId,
      details: `Updated tenant configuration for "${updates.name || prevTenant?.name || cleanId}".`,
      metadata: updates,
      severity: 'warning'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export interface DeleteTenantOptions {
  reason?: string;
  onProgress?: (step: number, totalSteps: number, message: string) => void;
}

export async function deleteTenant(
  tenantId: string, 
  actor?: Partial<AuditActor>,
  options?: DeleteTenantOptions
): Promise<DeletedBackup> {
  const cleanId = tenantId.trim().toLowerCase();
  if (cleanId === DEFAULT_TENANT_ID) {
    throw new Error(`The root default tenant ("${DEFAULT_TENANT_ID}") cannot be deleted as it is required by the platform.`);
  }

  const tenantRef = doc(db, 'tenants', cleanId);
  const tenantSnap = await getDoc(tenantRef);
  if (!tenantSnap.exists()) {
    throw new Error(`Tenant "${cleanId}" not found in database.`);
  }
  const tenantData = tenantSnap.data() as Tenant;

  // Step 1: Query and analyze all dependencies
  options?.onProgress?.(1, 4, `Analyzing active records & dependencies for ${tenantData.name}...`);
  
  const users: UserProfile[] = [];
  const events: DepartmentEvent[] = [];
  const registrations: EventRegistration[] = [];
  const certificates: IssuedCertificate[] = [];
  const winners: EventWinner[] = [];
  const announcements: any[] = [];
  const albums: any[] = [];
  const tickets: SupportTicket[] = [];

  try {
    const uSnap = await getDocs(query(collection(db, 'users'), where('tenantId', '==', cleanId)));
    uSnap.forEach(d => {
      const u = d.data() as UserProfile;
      // Safeguard: Never cascade delete super admins
      if (!u.isSuperAdmin && !SUPER_ADMIN_EMAILS.includes((u.email || '').toLowerCase())) {
        users.push(u);
      }
    });
  } catch (err) {
    console.warn('Error querying users for tenant deletion:', err);
  }

  try {
    const eSnap = await getDocs(query(collection(db, 'events'), where('tenantId', '==', cleanId)));
    eSnap.forEach(d => events.push(d.data() as DepartmentEvent));
  } catch (err) {
    console.warn('Error querying events for tenant deletion:', err);
  }

  try {
    const rSnap = await getDocs(query(collection(db, 'registrations'), where('tenantId', '==', cleanId)));
    rSnap.forEach(d => registrations.push(d.data() as EventRegistration));
  } catch (err) {
    console.warn('Error querying registrations for tenant deletion:', err);
  }

  try {
    const cSnap = await getDocs(query(collection(db, 'certificates'), where('tenantId', '==', cleanId)));
    cSnap.forEach(d => certificates.push(d.data() as IssuedCertificate));
  } catch (err) {
    console.warn('Error querying certificates for tenant deletion:', err);
  }

  try {
    const wSnap = await getDocs(query(collection(db, 'event_winners'), where('tenantId', '==', cleanId)));
    wSnap.forEach(d => winners.push(d.data() as EventWinner));
  } catch (err) {
    console.warn('Error querying winners for tenant deletion:', err);
  }

  try {
    const aSnap = await getDocs(query(collection(db, 'announcements'), where('tenantId', '==', cleanId)));
    aSnap.forEach(d => announcements.push(d.data()));
  } catch (err) {
    console.warn('Error querying announcements for tenant deletion:', err);
  }

  try {
    const albSnap = await getDocs(query(collection(db, 'albums'), where('tenantId', '==', cleanId)));
    albSnap.forEach(d => albums.push(d.data()));
  } catch (err) {
    console.warn('Error querying albums for tenant deletion:', err);
  }

  try {
    const tSnap = await getDocs(query(collection(db, 'support_tickets'), where('tenantId', '==', cleanId)));
    tSnap.forEach(d => tickets.push(d.data() as SupportTicket));
  } catch (err) {
    console.warn('Error querying tickets for tenant deletion:', err);
  }

  const curAuth = auth.currentUser;
  const resolvedActor: AuditActor = {
    uid: actor?.uid || curAuth?.uid || 'superadmin',
    email: actor?.email || curAuth?.email || 'superadmin@notx.app',
    name: actor?.name || curAuth?.displayName || (curAuth?.email?.split('@')[0]) || 'Super Admin',
    role: actor?.role || 'superadmin',
    isSuperAdmin: true
  };

  // Step 2: Backup to Deleted Vault
  options?.onProgress?.(2, 4, `Archiving comprehensive recovery snapshot to Deleted Vault...`);
  const backupId = `bk_tenant_cascade_${cleanId}_${Date.now()}`;
  const backupEntry: DeletedBackup = {
    backupId,
    entityType: 'tenant_cascade',
    entityId: cleanId,
    entityName: tenantData.name || cleanId,
    originalCollection: 'tenants',
    tenantId: cleanId,
    deletedBy: resolvedActor,
    deletedAt: new Date().toISOString(),
    originalData: tenantData,
    cascadeChildren: {
      users,
      events,
      registrations,
      certificates,
      winners,
      announcements,
      albums,
      tickets
    },
    metadata: {
      reason: options?.reason || 'Administrative removal',
      stats: {
        users: users.length,
        events: events.length,
        registrations: registrations.length,
        certificates: certificates.length,
        winners: winners.length,
        tickets: tickets.length
      }
    }
  };

  await setDoc(doc(db, 'deleted_backups', backupId), cleanUndefined(backupEntry));

  // Step 3: Cascade Deletion from active Firestore collections
  options?.onProgress?.(3, 4, `De-provisioning active tenant records and routing...`);
  
  const docsToDelete: { collection: string; id: string }[] = [];
  users.forEach(u => u.uid && docsToDelete.push({ collection: 'users', id: u.uid }));
  events.forEach(e => e.eventId && docsToDelete.push({ collection: 'events', id: e.eventId }));
  registrations.forEach(r => r.registrationId && docsToDelete.push({ collection: 'registrations', id: r.registrationId }));
  certificates.forEach(c => c.certificateId && docsToDelete.push({ collection: 'certificates', id: c.certificateId }));
  winners.forEach(w => w.winnerId && docsToDelete.push({ collection: 'event_winners', id: w.winnerId }));
  announcements.forEach(a => a.id && docsToDelete.push({ collection: 'announcements', id: a.id }));
  albums.forEach(alb => alb.id && docsToDelete.push({ collection: 'albums', id: alb.id }));
  tickets.forEach(t => t.id && docsToDelete.push({ collection: 'support_tickets', id: t.id }));
  docsToDelete.push({ collection: 'tenants', id: cleanId });

  // Delete in batches of 400
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docsToDelete.length; i += CHUNK_SIZE) {
    const chunk = docsToDelete.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(item => {
      batch.delete(doc(db, item.collection, item.id));
    });
    await batch.commit();
  }

  // Step 4: Audit Trail logging
  options?.onProgress?.(4, 4, `Writing permanent platform audit trail...`);
  await writeAuditLog({
    action: 'tenant.delete',
    actor: resolvedActor,
    tenantId: cleanId,
    entityType: 'tenant',
    entityId: cleanId,
    entityName: tenantData.name || cleanId,
    details: `Super Admin de-commissioned organization "${tenantData.name}" (${cleanId}). Reason: ${options?.reason || 'Administrative removal'}. Safely cascaded ${users.length} users, ${events.length} events, ${registrations.length} registrations to Deleted Vault (Backup: ${backupId}).`,
    metadata: {
      backupId,
      reason: options?.reason || 'Not specified',
      usersCount: users.length,
      eventsCount: events.length,
      registrationsCount: registrations.length,
      certificatesCount: certificates.length,
      ticketsCount: tickets.length
    },
    severity: 'critical'
  });

  return backupEntry;
}


export async function findTenantByAdminEmail(email: string): Promise<Tenant | null> {
  const clean = email.trim().toLowerCase();
  try {
    const q = query(collection(db, 'tenants'), where('adminEmail', '==', clean));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Tenant;
    }
    return null;
  } catch {
    return null;
  }
}

// Create synthetic student user in Firebase Auth using secondary isolated app instance so active admin session is preserved
export async function createStudentAuthAccount(
  rollNumber: string,
  tenantId: string,
  password: string
): Promise<{ email: string; uid?: string }> {
  const cleanRoll = rollNumber.trim().toLowerCase();
  const cleanTenant = (tenantId || DEFAULT_TENANT_ID).trim().toLowerCase();
  const syntheticEmail = `${cleanRoll}.${cleanTenant}@notx.com`;
  
  try {
    const existingApps = getSecondaryApps();
    const appName = "SecondaryStudentAuthApp";
    const secApp = existingApps.find(a => a.name === appName) || initializeApp(firebaseConfig, appName);
    const secAuth = getAuth(secApp);
    
    const userCredential = await createUserWithEmailAndPassword(secAuth, syntheticEmail, password);
    await signOutSecondary(secAuth);
    return { email: syntheticEmail, uid: userCredential.user.uid };
  } catch (error: any) {
    if (error?.code === 'auth/email-already-in-use') {
      return { email: syntheticEmail };
    }
    console.warn("Firebase Auth secondary account registration note:", error?.message);
    return { email: syntheticEmail };
  }
}

// Initial Seeding Data
const INITIAL_USERS: UserProfile[] = [
  {
    uid: "user_admin_syed",
    name: "Sameer Ahmed (Super Admin)",
    email: "syedsame2244@gmail.com",
    googleEmail: "syedsame2244@gmail.com",
    role: "admin",
    tenantId: "cse-aiml",
    isSuperAdmin: true,
    phone: "+91 9999999999",
    profile_pic: "",
    rollNumber: "ADMIN001",
    position: "Super Admin & Student President",
    department: "CSE (AI & ML)",
    responsibilities: "Administrator of NOTX Multi-Tenant SaaS and HOD Executive coordinator.",
    created_at: new Date().toISOString()
  },
  {
    uid: "user_admin",
    name: "Dr. XYZ Prasad",
    email: "xyz.prasad@aits.edu",
    role: "admin",
    phone: "+91 9876543210",
    profile_pic: "",
    rollNumber: "ADMIN002",
    position: "HOD & Association Chief Patron",
    department: "CSE (AI & ML)",
    responsibilities: "Overall administrative oversight, event approvals, and strategic vision for NOTX Association.",
    created_at: new Date().toISOString()
  },
  {
    uid: "user_associate_president",
    name: "Sameer Ahmed",
    email: "sameer.notx@aits.edu",
    role: "associate",
    phone: "+91 8765432109",
    profile_pic: "",
    rollNumber: "ASSOC001",
    position: "President, NOTX",
    department: "CSE (AI & ML)",
    year: "4th Year",
    linkedin: "https://linkedin.com/in/sameer-ai-ml",
    responsibilities: "Leading student initiatives, coordinating with HOD, and managing event schedules and notifications.",
    powers: {
      canManageEvents: true,
      canManageAnnouncements: true,
      canViewRegistrations: true,
      canManageGallery: true
    },
    created_at: new Date().toISOString()
  },
  {
    uid: "user_associate_tech",
    name: "John Doe",
    email: "john.doe@aits.edu",
    role: "associate",
    phone: "+91 7654321098",
    profile_pic: "",
    rollNumber: "ASSOC002",
    position: "Technical Lead",
    department: "CSE (AI & ML)",
    year: "3rd Year",
    linkedin: "https://linkedin.com/in/johndoe-tech",
    responsibilities: "Organizing hackathons, technical workshops, and mentoring students in GenAI models and AI pipelines.",
    powers: {
      canManageEvents: true,
      canManageAnnouncements: false,
      canViewRegistrations: true,
      canManageGallery: true
    },
    created_at: new Date().toISOString()
  }
];

const INITIAL_EVENTS: DepartmentEvent[] = [
  {
    eventId: "event_ai_builder",
    title: "AI Builder Arena Hackathon",
    category: "Hackathons",
    description: "Build cutting-edge GenAI solutions using Gemini API, LangChain, or direct LLM agents. Teams of 1 to 4 members. Prizes worth ₹50,000 to be won!",
    date: "2026-08-10",
    startTime: "10:00 AM",
    endTime: "05:00 PM",
    duration: "7 Hours",
    venue: "AI & ML Innovation Lab, Block 3",
    facultyCoordinator: "Dr. XYZ Prasad",
    studentCoordinators: "Sameer Ahmed, John Doe",
    maxParticipants: 100,
    registrationDeadline: "2026-08-08",
    posterImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&h=450&q=80",
    rules: "1. Open only to CSE/AML branch students.\n2. Projects must use some form of Artificial Intelligence or LLMs.\n3. Pre-existing codes are not allowed; GitHub history will be evaluated.\n4. Judgment criteria: Innovation, Technical Depth, UI/UX, and Pitch Presentation.",
    requirements: "Laptops, GitHub accounts, and active Google AI Studio API key.",
    createdAt: new Date().toISOString(),
    isTeamBased: true,
    maxTeamSize: 4
  },
  {
    eventId: "event_prompt_workshop",
    title: "Advanced Prompt Engineering & Agentic Workflow",
    category: "Workshops",
    description: "Hands-on masterclass focusing on system prompting, chain of thought, dynamic routing, and setting up Multi-Agent systems using AutoGen & CrewAI.",
    date: "2026-08-15",
    startTime: "11:00 AM",
    endTime: "02:00 PM",
    duration: "3 Hours",
    venue: "Seminar Hall-1",
    facultyCoordinator: "Mrs. M. Anuradha",
    studentCoordinators: "Neha Sharma, Sameer Ahmed",
    maxParticipants: 60,
    registrationDeadline: "2026-08-14",
    posterImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&h=450&q=80",
    rules: "1. Prior basic Python knowledge is recommended but not mandatory.\n2. Bring a fully-charged laptop with Google Colab set up.",
    requirements: "Web browser, Gmail account.",
    createdAt: new Date().toISOString(),
    isTeamBased: false
  },
  {
    eventId: "event_cultural_aml",
    title: "AML Tech-Fest & Creative Cultural Meet",
    category: "Cultural Events",
    description: "An offline celebration blending creative technical exhibits with cultural performances, AI art displays, stand-up comedy, and acoustic music.",
    date: "2026-08-25",
    startTime: "02:00 PM",
    endTime: "06:00 PM",
    duration: "4 Hours",
    venue: "Open Auditorium",
    facultyCoordinator: "Dr. XYZ Prasad",
    studentCoordinators: "Sameer Ahmed",
    maxParticipants: 300,
    registrationDeadline: "2026-08-24",
    posterImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&h=450&q=80",
    rules: "1. Registration is free for all association members.\n2. Registration mandatory for catering arrangements.",
    requirements: "Show app registration badge at the gate.",
    createdAt: new Date().toISOString(),
    isTeamBased: false
  }
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    announcementId: "announce_mid_exam",
    title: "Mid-I Examinations Schedule (V-Semester)",
    content: "The Mid-I examinations for B.Tech IIIrd Year I-Sem (AI&ML) will commence from August 1st, 2026. The detailed timetable has been pinned on the notice board. Topics up to Unit-II are included. Clear all tuition fee dues immediately to get your hall ticket.",
    category: "Exam",
    date: "2026-07-01",
    author: "HOD Office"
  },
  {
    announcementId: "announce_notx_launch",
    title: "Registration Open for NOTX Connect App",
    content: "Welcome to our customized department app! All CSE (AI & ML) students are requested to create their profile, add their tech skills, and register for the upcoming AI Builder Hackathon directly via this application.",
    category: "News",
    date: "2026-07-01",
    author: "NOTX Association"
  },
  {
    announcementId: "announce_results_arena",
    title: "Prompt Engineering Workshop Registrations Live!",
    content: "Seats are limited to 60 for the upcoming Masterclass on Prompt Engineering on August 15th. Register right away from the events page. E-certificates will be provided to all attendees.",
    category: "Workshop",
    date: "2026-07-02",
    author: "Technical Committee"
  }
];

const INITIAL_ALBUMS: Album[] = [
  {
    albumId: 'album_1',
    title: 'Hackathon 2025 Highlights',
    description: 'Amazing moments from our annual hackathon.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80'
    ],
    category: 'Hackathons',
    uploadedBy: 'Admin',
    createdAt: new Date().toISOString()
  }
];


export async function seedDatabaseIfEmpty() {
  try {
    await seedAdminAuthIfEmpty();
    const seedStatusRef = doc(db, 'appSettings', 'seed_status');
    const seedSnap = await getDoc(seedStatusRef);
    if (!seedSnap.exists() || !seedSnap.data()?.isSeeded) {
      await setDoc(seedStatusRef, { isSeeded: true, seededAt: new Date().toISOString() });
    }
  } catch (error) {
    // Ignore seeding check errors
  }
}

// ---------------- DATABASE ERROR HANDLING ----------------

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to recursively remove undefined properties before writing to Firestore
function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        result[key] = cleanUndefined(val);
      }
    }
  }
  return result as T;
}

// ---------------- AUDIT LOGS & SOFT-DELETE BACKUP SYSTEM ----------------

export async function writeAuditLog(entry: {
  action: AuditAction | string;
  actor?: Partial<AuditActor>;
  tenantId?: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'critical';
}): Promise<void> {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const curAuth = auth.currentUser;
    const actor: AuditActor = {
      uid: entry.actor?.uid || curAuth?.uid || 'system',
      email: entry.actor?.email || curAuth?.email || 'system@notx.app',
      name: entry.actor?.name || curAuth?.displayName || (curAuth?.email?.split('@')[0]) || 'System Admin',
      role: entry.actor?.role || 'admin',
      isSuperAdmin: entry.actor?.isSuperAdmin ?? (curAuth?.email ? SUPER_ADMIN_EMAILS.includes(curAuth.email.toLowerCase()) : false)
    };

    let severity = entry.severity;
    if (!severity) {
      if (entry.action.includes('delete') || entry.action.includes('reset') || entry.action.includes('purge')) {
        severity = 'critical';
      } else if (entry.action.includes('revoke') || entry.action.includes('role') || entry.action.includes('restore') || entry.action.includes('unauthorized')) {
        severity = 'warning';
      } else {
        severity = 'info';
      }
    }

    const logDoc: AuditLogEntry = {
      logId,
      timestamp: new Date().toISOString(),
      action: entry.action,
      actor,
      tenantId: entry.tenantId || getActiveTenantId(),
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityName: entry.entityName,
      details: entry.details,
      metadata: entry.metadata,
      severity
    };

    const docRef = doc(db, 'audit_logs', logId);
    await setDoc(docRef, cleanUndefined(logDoc));
  } catch (err) {
    // Non-blocking fire-and-forget
    console.warn('Silent audit log write error:', err);
  }
}

export async function softDelete(
  collectionName: string,
  docId: string,
  entityType: string,
  actor?: Partial<AuditActor>,
  tenantId?: string,
  entityName?: string,
  cascadeChildren?: Record<string, any>
): Promise<DeletedBackup | null> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    let originalData: any = null;
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        originalData = snap.data();
      }
    } catch (readErr) {
      console.warn(`Could not read document before deletion: ${path}`, readErr);
    }

    const resolvedTenant = tenantId || originalData?.tenantId || getActiveTenantId();
    const curAuth = auth.currentUser;
    const resolvedActor: AuditActor = {
      uid: actor?.uid || curAuth?.uid || 'system',
      email: actor?.email || curAuth?.email || 'system@notx.app',
      name: actor?.name || curAuth?.displayName || (curAuth?.email?.split('@')[0]) || 'System Admin',
      role: actor?.role || 'admin',
      isSuperAdmin: actor?.isSuperAdmin ?? (curAuth?.email ? SUPER_ADMIN_EMAILS.includes(curAuth.email.toLowerCase()) : false)
    };

    const backupId = `bk_${entityType}_${docId}_${Date.now()}`;
    const resolvedName = entityName || originalData?.title || originalData?.name || originalData?.studentName || originalData?.rollNumber || docId;
    const backupEntry: DeletedBackup = {
      backupId,
      entityType,
      entityId: docId,
      entityName: resolvedName,
      tenantId: resolvedTenant,
      deletedBy: resolvedActor,
      deletedAt: new Date().toISOString(),
      originalData: originalData || { id: docId },
      ...(cascadeChildren ? { cascadeChildren } : {})
    };

    // 1. Save backup first
    try {
      await setDoc(doc(db, 'deleted_backups', backupId), cleanUndefined(backupEntry));
    } catch (bErr) {
      console.error(`Failed to store deleted backup for ${path}:`, bErr);
    }

    // 2. Now delete from active collection
    await deleteDoc(docRef);

    // 3. Write audit log
    await writeAuditLog({
      action: `${entityType}.delete`,
      actor: resolvedActor,
      tenantId: resolvedTenant,
      entityType,
      entityId: docId,
      entityName: resolvedName,
      details: `Deleted ${entityType} "${resolvedName}" (Soft-deleted and archived in Deleted Vault).`,
      severity: 'critical'
    });

    return backupEntry;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function cascadeDeleteEvent(eventId: string, actor?: Partial<AuditActor>): Promise<void> {
  const path = `events/${eventId}`;
  try {
    const eventRef = doc(db, 'events', eventId);
    let eventData: any = null;
    try {
      const snap = await getDoc(eventRef);
      if (snap.exists()) eventData = snap.data();
    } catch (err) {
      console.warn('Error reading event for cascade delete:', err);
    }

    // Gather child records
    const registrations: EventRegistration[] = [];
    const certificates: IssuedCertificate[] = [];
    const winners: EventWinner[] = [];

    try {
      const regSnap = await getDocs(query(collection(db, 'registrations'), where('eventId', '==', eventId)));
      regSnap.forEach(d => registrations.push(d.data() as EventRegistration));
    } catch (err) {
      console.warn('Error querying registrations for cascade delete:', err);
    }

    try {
      const certSnap = await getDocs(query(collection(db, 'certificates'), where('eventId', '==', eventId)));
      certSnap.forEach(d => certificates.push(d.data() as IssuedCertificate));
    } catch (err) {
      console.warn('Error querying certificates for cascade delete:', err);
    }

    try {
      const winSnap = await getDocs(query(collection(db, 'event_winners'), where('eventId', '==', eventId)));
      winSnap.forEach(d => winners.push(d.data() as EventWinner));
    } catch (err) {
      console.warn('Error querying winners for cascade delete:', err);
    }

    const curAuth = auth.currentUser;
    const resolvedActor: AuditActor = {
      uid: actor?.uid || curAuth?.uid || 'admin',
      email: actor?.email || curAuth?.email || 'admin@notx.app',
      name: actor?.name || curAuth?.displayName || (curAuth?.email?.split('@')[0]) || 'Admin',
      role: actor?.role || 'admin',
      isSuperAdmin: actor?.isSuperAdmin ?? (curAuth?.email ? SUPER_ADMIN_EMAILS.includes(curAuth.email.toLowerCase()) : false)
    };

    const resolvedTenant = eventData?.tenantId || getActiveTenantId();
    const eventTitle = eventData?.title || eventId;
    const backupId = `bk_cascade_event_${eventId}_${Date.now()}`;

    // 1. Create full cascade backup in deleted_backups
    const backupEntry: DeletedBackup = {
      backupId,
      entityType: 'event_cascade',
      entityId: eventId,
      entityName: eventTitle,
      tenantId: resolvedTenant,
      deletedBy: resolvedActor,
      deletedAt: new Date().toISOString(),
      originalData: eventData || { eventId },
      cascadeChildren: {
        registrations,
        certificates,
        winners
      }
    };

    try {
      await setDoc(doc(db, 'deleted_backups', backupId), cleanUndefined(backupEntry));
    } catch (bErr) {
      console.error('Failed to store event cascade backup in deleted_backups:', bErr);
    }

    // 2. Cascade delete from active collections (batch operations)
    const batch = writeBatch(db);
    batch.delete(eventRef);

    for (const reg of registrations) {
      if (reg.registrationId) {
        batch.delete(doc(db, 'registrations', reg.registrationId));
      }
    }
    for (const cert of certificates) {
      if (cert.certificateId) {
        batch.delete(doc(db, 'certificates', cert.certificateId));
      }
    }
    for (const win of winners) {
      if (win.winnerId) {
        batch.delete(doc(db, 'event_winners', win.winnerId));
      }
    }

    await batch.commit();

    // 3. Write comprehensive audit log
    await writeAuditLog({
      action: 'event.cascade_delete',
      actor: resolvedActor,
      tenantId: resolvedTenant,
      entityType: 'event',
      entityId: eventId,
      entityName: eventTitle,
      details: `Permanently removed event "${eventTitle}" and cascaded deletion of ${registrations.length} registrations/passes, ${certificates.length} certificates, and ${winners.length} winners. Full backup retained in Deleted Vault.`,
      metadata: {
        registrationsCount: registrations.length,
        certificatesCount: certificates.length,
        winnersCount: winners.length,
        backupId
      },
      severity: 'critical'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function restoreDeletedBackup(backupId: string, actor?: Partial<AuditActor>): Promise<void> {
  const backupRef = doc(db, 'deleted_backups', backupId);
  const snap = await getDoc(backupRef);
  if (!snap.exists()) throw new Error('Backup not found');
  const backup = snap.data() as DeletedBackup;

  const curAuth = auth.currentUser;
  const resolvedActor: AuditActor = {
    uid: actor?.uid || curAuth?.uid || 'superadmin',
    email: actor?.email || curAuth?.email || 'admin@notx.app',
    name: actor?.name || curAuth?.displayName || 'Super Admin',
    role: actor?.role || 'superadmin',
    isSuperAdmin: true
  };

  // Restore main doc
  if (backup.entityType === 'event' || backup.entityType === 'event_cascade') {
    if (backup.originalData) {
      await setDoc(doc(db, 'events', backup.entityId), cleanUndefined(backup.originalData));
    }
    // Restore cascade children if any
    if (backup.cascadeChildren?.registrations) {
      for (const reg of backup.cascadeChildren.registrations) {
        if (reg.registrationId) {
          await setDoc(doc(db, 'registrations', reg.registrationId), cleanUndefined(reg));
        }
      }
    }
    if (backup.cascadeChildren?.certificates) {
      for (const cert of backup.cascadeChildren.certificates) {
        if (cert.certificateId) {
          await setDoc(doc(db, 'certificates', cert.certificateId), cleanUndefined(cert));
        }
      }
    }
    if (backup.cascadeChildren?.winners) {
      for (const winner of backup.cascadeChildren.winners) {
        if (winner.winnerId) {
          await setDoc(doc(db, 'event_winners', winner.winnerId), cleanUndefined(winner));
        }
      }
    }
  } else if (backup.entityType === 'registration') {
    await setDoc(doc(db, 'registrations', backup.entityId), cleanUndefined(backup.originalData));
  } else if (backup.entityType === 'announcement') {
    await setDoc(doc(db, 'announcements', backup.entityId), cleanUndefined(backup.originalData));
  } else if (backup.entityType === 'album') {
    await setDoc(doc(db, 'albums', backup.entityId), cleanUndefined(backup.originalData));
  } else if (backup.entityType === 'certificate') {
    await setDoc(doc(db, 'certificates', backup.entityId), cleanUndefined(backup.originalData));
  } else if (backup.entityType === 'event_winner') {
    await setDoc(doc(db, 'event_winners', backup.entityId), cleanUndefined(backup.originalData));
  } else if (backup.entityType === 'user') {
    await setDoc(doc(db, 'users', backup.entityId), cleanUndefined(backup.originalData));
  } else if (backup.entityType === 'tenant' || backup.entityType === 'tenant_cascade') {
    if (backup.originalData) {
      await setDoc(doc(db, 'tenants', backup.entityId), cleanUndefined(backup.originalData));
    }
    if (backup.cascadeChildren?.users) {
      for (const u of backup.cascadeChildren.users) {
        if (u.uid) await setDoc(doc(db, 'users', u.uid), cleanUndefined(u));
      }
    }
    if (backup.cascadeChildren?.events) {
      for (const ev of backup.cascadeChildren.events) {
        if (ev.eventId) await setDoc(doc(db, 'events', ev.eventId), cleanUndefined(ev));
      }
    }
    if (backup.cascadeChildren?.registrations) {
      for (const reg of backup.cascadeChildren.registrations) {
        if (reg.registrationId) await setDoc(doc(db, 'registrations', reg.registrationId), cleanUndefined(reg));
      }
    }
    if (backup.cascadeChildren?.certificates) {
      for (const cert of backup.cascadeChildren.certificates) {
        if (cert.certificateId) await setDoc(doc(db, 'certificates', cert.certificateId), cleanUndefined(cert));
      }
    }
    if (backup.cascadeChildren?.winners) {
      for (const winner of backup.cascadeChildren.winners) {
        if (winner.winnerId) await setDoc(doc(db, 'event_winners', winner.winnerId), cleanUndefined(winner));
      }
    }
    if (backup.cascadeChildren?.announcements) {
      for (const ann of backup.cascadeChildren.announcements) {
        if (ann.id) await setDoc(doc(db, 'announcements', ann.id), cleanUndefined(ann));
      }
    }
    if (backup.cascadeChildren?.albums) {
      for (const alb of backup.cascadeChildren.albums) {
        if (alb.id) await setDoc(doc(db, 'albums', alb.id), cleanUndefined(alb));
      }
    }
    if (backup.cascadeChildren?.tickets) {
      for (const t of backup.cascadeChildren.tickets) {
        if (t.id) await setDoc(doc(db, 'support_tickets', t.id), cleanUndefined(t));
      }
    }
  }

  // Update backup entry with restoration metadata
  await updateDoc(backupRef, {
    restoredAt: new Date().toISOString(),
    restoredBy: resolvedActor.email
  });

  const isTenantRestore = backup.entityType === 'tenant' || backup.entityType === 'tenant_cascade';

  await writeAuditLog({
    action: isTenantRestore ? 'tenant.revive' : 'backup.restore',
    actor: resolvedActor,
    tenantId: backup.tenantId,
    entityType: backup.entityType,
    entityId: backup.entityId,
    entityName: backup.entityName,
    details: isTenantRestore 
      ? `Super Admin revived organization "${backup.entityName}" (${backup.entityId}) from Deleted Vault and restored all associated users, events, and records back to active fleet.`
      : `Restored deleted ${backup.entityType} "${backup.entityName}" back to active database.`,
    severity: isTenantRestore ? 'critical' : 'warning'
  });
}

export async function purgeDeletedBackup(backupId: string, actor?: Partial<AuditActor>): Promise<void> {
  const backupRef = doc(db, 'deleted_backups', backupId);
  const snap = await getDoc(backupRef);
  const backup = snap.exists() ? (snap.data() as DeletedBackup) : null;

  const curAuth = auth.currentUser;
  const resolvedActor: AuditActor = {
    uid: actor?.uid || curAuth?.uid || 'superadmin',
    email: actor?.email || curAuth?.email || 'admin@notx.app',
    name: actor?.name || curAuth?.displayName || 'Super Admin',
    role: actor?.role || 'superadmin',
    isSuperAdmin: true
  };

  await deleteDoc(backupRef);

  await writeAuditLog({
    action: 'backup.purge',
    actor: resolvedActor,
    tenantId: backup?.tenantId || 'global',
    entityType: backup?.entityType || 'backup',
    entityId: backupId,
    entityName: backup?.entityName || backupId,
    details: `Permanently purged backup record "${backup?.entityName || backupId}" from Deleted Vault.`,
    severity: 'critical'
  });
}

export function subscribeToAuditLogs(callback: (logs: AuditLogEntry[]) => void, maxCount = 200): () => void {
  try {
    const q = query(collection(db, 'audit_logs'), limit(maxCount));
    return onSnapshot(q, (snap) => {
      const logs: AuditLogEntry[] = [];
      snap.forEach(d => logs.push(d.data() as AuditLogEntry));
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(logs);
    }, (err) => {
      console.warn('subscribeToAuditLogs snapshot error:', err);
    });
  } catch (err) {
    console.warn('subscribeToAuditLogs error:', err);
    return () => {};
  }
}

export function subscribeToDeletedBackups(callback: (backups: DeletedBackup[]) => void): () => void {
  try {
    const q = query(collection(db, 'deleted_backups'));
    return onSnapshot(q, (snap) => {
      const list: DeletedBackup[] = [];
      snap.forEach(d => list.push(d.data() as DeletedBackup));
      list.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
      callback(list);
    }, (err) => {
      console.warn('subscribeToDeletedBackups snapshot error:', err);
    });
  } catch (err) {
    console.warn('subscribeToDeletedBackups error:', err);
    return () => {};
  }
}

// ---------------- DATABASE ACTIONS ----------------


// Users
export async function fetchUsers(tenantId?: string): Promise<UserProfile[]> {
  try {
    const cleanTid = tenantId ? tenantId.trim().toLowerCase() : '';
    const q = cleanTid
      ? query(collection(db, 'users'), where('tenantId', '==', cleanTid))
      : collection(db, 'users');
    const querySnapshot = await getDocs(q);
    const rawUsers: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      const u = doc.data() as UserProfile;
      if (u.password) delete u.password;
      rawUsers.push(u);
    });

    if (!cleanTid) {
      return rawUsers;
    }

    // Filter to tenant, strictly excluding global super admins & system admin_master
    const tenantUsers = rawUsers.filter(u => {
      if (u.isSuperAdmin || u.uid === 'admin_master') return false;
      if (u.email && SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === u.email.trim().toLowerCase())) return false;
      return true;
    });

    // Deduplicate placeholder admin if authentic admin exists for this tenant
    const adminUsers = tenantUsers.filter(u => u.role === 'admin');
    const realAdmin = adminUsers.find(u => !u.uid.startsWith('admin_'));
    const placeholderAdmin = adminUsers.find(u => u.uid.startsWith('admin_'));

    if (realAdmin && placeholderAdmin) {
      return tenantUsers.filter(u => u.uid !== placeholderAdmin.uid);
    }

    return tenantUsers;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

export async function fetchUserById(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteUserProfile(uid: string, actor?: Partial<AuditActor>): Promise<void> {
  await softDelete('users', uid, 'user', actor);
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, cleanUndefined(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    const docRef = doc(db, 'users', profile.uid);
    await setDoc(docRef, cleanUndefined(profile));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createMultipleUserProfiles(profiles: UserProfile[]): Promise<void> {
  if (profiles.length === 0) return;
  const path = 'users';
  try {
    const batchSize = 400;
    for (let i = 0; i < profiles.length; i += batchSize) {
      const chunk = profiles.slice(i, i + batchSize);
      const batch = writeBatch(db);
      for (const profile of chunk) {
        const docRef = doc(db, 'users', profile.uid);
        batch.set(docRef, cleanUndefined(profile));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function findUserForLogin(identifier: string, tenantId?: string): Promise<UserProfile | null> {
  const cleanId = identifier.trim();
  const lowerId = cleanId.toLowerCase();
  const upperId = cleanId.toUpperCase();
  const cleanTenant = (tenantId || '').trim().toLowerCase();
  const syntheticEmail = cleanTenant ? `${lowerId}.${cleanTenant}@notx.com` : '';

  // 1. Check direct doc lookup by student roll ID pattern
  try {
    const directDocIds = [
      `user_student_${lowerId}_${cleanTenant}`,
      `user_student_${lowerId}`,
      `admin_${cleanTenant}`,
      `user_admin_syed`
    ];
    for (const dId of directDocIds) {
      const docRef = doc(db, 'users', dId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const u = docSnap.data() as UserProfile;
        if (!cleanTenant || u.tenantId === cleanTenant || u.isSuperAdmin) {
          return u;
        }
      }
    }
  } catch {
    // proceed
  }

  // 2. Query by rollNumber
  try {
    const qRoll = query(collection(db, 'users'), where('rollNumber', 'in', [upperId, cleanId, lowerId]));
    const snapRoll = await getDocs(qRoll);
    if (!snapRoll.empty) {
      if (cleanTenant) {
        const tenantMatch = snapRoll.docs.find(d => {
          const u = d.data() as UserProfile;
          return u.tenantId === cleanTenant || u.isSuperAdmin;
        });
        if (tenantMatch) return tenantMatch.data() as UserProfile;
      } else {
        return snapRoll.docs[0].data() as UserProfile;
      }
    }
  } catch {
    // proceed
  }

  // 3. Query by email
  try {
    const searchEmails = [lowerId, cleanId];
    if (syntheticEmail) searchEmails.push(syntheticEmail);
    const qEmail = query(collection(db, 'users'), where('email', 'in', searchEmails));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      if (cleanTenant) {
        const tenantMatch = snapEmail.docs.find(d => {
          const u = d.data() as UserProfile;
          return u.tenantId === cleanTenant || u.isSuperAdmin;
        });
        if (tenantMatch) return tenantMatch.data() as UserProfile;
      } else {
        return snapEmail.docs[0].data() as UserProfile;
      }
    }
  } catch {
    // proceed
  }

  return null;
}

// ---------------- DEDICATED PUBLIC ASSOCIATES REGISTRY ----------------
export async function fetchAssociates(tenantId?: string): Promise<AssociateMember[]> {
  try {
    const cleanTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
    const q = cleanTid
      ? query(collection(db, 'associates'), where('tenantId', '==', cleanTid))
      : collection(db, 'associates');
    const querySnapshot = await getDocs(q);
    const list: AssociateMember[] = [];
    querySnapshot.forEach((d) => {
      list.push(d.data() as AssociateMember);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'associates');
    return [];
  }
}

export async function createAssociate(associate: AssociateMember): Promise<void> {
  const path = `associates/${associate.id}`;
  try {
    const docRef = doc(db, 'associates', associate.id);
    await setDoc(docRef, cleanUndefined(associate));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAssociate(id: string, data: Partial<AssociateMember>): Promise<void> {
  const path = `associates/${id}`;
  try {
    const docRef = doc(db, 'associates', id);
    await updateDoc(docRef, cleanUndefined(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAssociate(id: string): Promise<void> {
  const path = `associates/${id}`;
  try {
    const docRef = doc(db, 'associates', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToAssociates(callback: (associates: AssociateMember[]) => void, tenantId?: string): () => void {
  try {
    const cleanTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
    const q = cleanTid
      ? query(collection(db, 'associates'), where('tenantId', '==', cleanTid))
      : collection(db, 'associates');
    return onSnapshot(q, (snapshot) => {
      const list: AssociateMember[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as AssociateMember);
      });
      callback(list);
    }, (error) => {
      console.warn('Associates real-time subscription notice:', error);
      callback([]);
    });
  } catch (err) {
    console.warn('Failed to subscribe to associates:', err);
    return () => {};
  }
}

// Events
export async function fetchEvents(tenantId?: string): Promise<DepartmentEvent[]> {
  try {
    const cleanTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
    const q = cleanTid
      ? query(collection(db, 'events'), where('tenantId', '==', cleanTid))
      : collection(db, 'events');
    const querySnapshot = await getDocs(q);
    const events: DepartmentEvent[] = [];
    querySnapshot.forEach((doc) => {
      events.push(doc.data() as DepartmentEvent);
    });
    // Sort by date ascending
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'events');
    return [];
  }
}

export function getActiveTenantId(): string {
  try {
    return localStorage.getItem('notx_active_tenant') || '';
  } catch {
    return '';
  }
}

export function getActiveTenantShortCode(): string {
  try {
    const raw = localStorage.getItem('notx_active_tenant') || '';
    if (!raw) return 'ORG';
    const clean = raw.replace(/^dept-/, '');
    const parts = clean.split('-');
    const candidate = parts[parts.length - 1].toUpperCase();
    return candidate.slice(0, 6) || 'ORG';
  } catch {
    return 'ORG';
  }
}

export async function createEvent(event: DepartmentEvent): Promise<void> {
  const path = `events/${event.eventId}`;
  try {
    const docRef = doc(db, 'events', event.eventId);
    const finalEvent = {
      ...event,
      tenantId: event.tenantId || getActiveTenantId()
    };
    await setDoc(docRef, cleanUndefined(finalEvent));

    await writeAuditLog({
      action: 'event.create',
      tenantId: finalEvent.tenantId,
      entityType: 'event',
      entityId: finalEvent.eventId,
      entityName: finalEvent.title,
      details: `Created new event "${finalEvent.title}" (${finalEvent.category}) on ${finalEvent.date}.`,
      severity: 'info'
    });

    broadcastAppNotification({
      tenantId: finalEvent.tenantId,
      title: '⚡ New Event Announced!',
      message: `"${finalEvent.title}" (${finalEvent.category}) is now open for registration! Check guidelines and claim your pass.`,
      type: 'event',
      link: `/events/${finalEvent.eventId}`
    }).catch(e => console.warn('Event broadcast notification note:', e));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}


// Registrations
export async function fetchRegistrations(tenantId?: string): Promise<EventRegistration[]> {
  try {
    const cleanTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
    const q = cleanTid
      ? query(collection(db, 'registrations'), where('tenantId', '==', cleanTid))
      : collection(db, 'registrations');
    const querySnapshot = await getDocs(q);
    const registrations: EventRegistration[] = [];
    querySnapshot.forEach((doc) => {
      registrations.push(doc.data() as EventRegistration);
    });
    return registrations;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'registrations');
    return [];
  }
}

export async function fetchRegistrationsByStudent(studentId: string): Promise<EventRegistration[]> {
  try {
    const q = query(collection(db, 'registrations'), where('studentId', '==', studentId));
    const querySnapshot = await getDocs(q);
    const registrations: EventRegistration[] = [];
    querySnapshot.forEach((doc) => {
      registrations.push(doc.data() as EventRegistration);
    });
    return registrations;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'registrations');
    return [];
  }
}

export async function fetchRegistrationsByEvent(eventId: string): Promise<EventRegistration[]> {
  try {
    const q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
    const querySnapshot = await getDocs(q);
    const registrations: EventRegistration[] = [];
    querySnapshot.forEach((doc) => {
      registrations.push(doc.data() as EventRegistration);
    });
    return registrations;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'registrations');
    return [];
  }
}

export async function createRegistration(reg: EventRegistration): Promise<void> {
  const path = `registrations/${reg.registrationId}`;
  try {
    const activeTid = (reg.tenantId || getActiveTenantId()).trim().toLowerCase();
    const finalReg = {
      ...reg,
      tenantId: activeTid
    };

    const regDocRef = doc(db, 'registrations', reg.registrationId);
    const eventDocRef = doc(db, 'events', reg.eventId);

    const maxRetries = 15;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await runTransaction(db, async (transaction) => {
          // 1. Verify capacity if tracked on event
          const eventSnap = await transaction.get(eventDocRef);
          if (eventSnap.exists()) {
            const evData = eventSnap.data() as DepartmentEvent;

            // Strict Multi-Tenant Boundary: Students can only register for their own tenant's events
            const eventTenant = (evData.tenantId || '').trim().toLowerCase();
            const studentTenant = (finalReg.tenantId || '').trim().toLowerCase();
            if (eventTenant && studentTenant && eventTenant !== studentTenant) {
              throw new Error(`Cross-Tenant Registration Denied: Event "${evData.title}" belongs to department "${evData.tenantId}". You can only register for events organized by your own department.`);
            }

            if (evData.maxParticipants && evData.maxParticipants > 0) {
              const currentCount = evData.currentRegistrations || 0;
              if (currentCount >= evData.maxParticipants) {
                throw new Error(`Event "${evData.title}" is full (maximum capacity: ${evData.maxParticipants}).`);
              }
              transaction.update(eventDocRef, {
                currentRegistrations: currentCount + 1
              });
            }
          }

          // 2. Set registration record
          transaction.set(regDocRef, cleanUndefined(finalReg));
        });

        // Succeeded
        break;
      } catch (err: any) {
        const msg = err?.message || String(err);
        // Domain rejections: do not retry
        if (msg.includes('Cross-Tenant Registration Denied') || msg.includes('full')) {
          throw err;
        }

        attempt++;
        if (attempt >= maxRetries) {
          handleFirestoreError(err, OperationType.CREATE, path);
          throw err;
        }
        // Contention backoff with random jitter (50ms - 400ms)
        const jitter = Math.floor(Math.random() * 80);
        const delay = Math.min(1200, Math.pow(1.5, attempt) * 60 + jitter);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    await writeAuditLog({
      action: 'registration.create',
      tenantId: finalReg.tenantId,
      entityType: 'registration',
      entityId: finalReg.registrationId,
      entityName: `${finalReg.studentName} (${finalReg.rollNumber})`,
      details: `Registered for event "${finalReg.eventId}" ${finalReg.isTeam ? `as team "${finalReg.teamName}"` : 'individually'}.`,
      severity: 'info'
    });

    sendAppNotification({
      tenantId: finalReg.tenantId,
      userId: finalReg.studentId,
      title: '🎟️ Registration Pass Confirmed!',
      message: `Your entry pass for event has been confirmed. Open your passes to view your QR code.`,
      type: 'registration',
      link: `/events/${finalReg.eventId}`
    }).catch(e => console.warn('Registration notification note:', e));
  } catch (error: any) {
    if (!error?.message?.includes('Cross-Tenant Registration Denied') && !error?.message?.includes('full')) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    throw error;
  }
}

export function subscribeToRegistrations(
  callback: (registrations: EventRegistration[]) => void,
  tenantId?: string,
  eventId?: string
): () => void {
  const path = 'registrations';
  const filterTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
  try {
    let q: any = collection(db, 'registrations');
    if (filterTid && eventId) {
      q = query(collection(db, 'registrations'), where('tenantId', '==', filterTid), where('eventId', '==', eventId));
    } else if (filterTid) {
      q = query(collection(db, 'registrations'), where('tenantId', '==', filterTid));
    } else if (eventId) {
      q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
    }

    return onSnapshot(q, (snapshot: any) => {
      const registrations: EventRegistration[] = [];
      snapshot.forEach((d: any) => {
        registrations.push(d.data() as EventRegistration);
      });
      // Sort newest registration first
      registrations.sort((a, b) => new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime());
      callback(registrations);
    }, (error: any) => {
      console.error('Error subscribing to registrations:', error);
      handleFirestoreError(error, OperationType.LIST, path);
      callback([]);
    });
  } catch (error) {
    console.error('Error setting up registrations subscription:', error);
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function updateRegistrationStatus(
  regId: string, 
  status: 'Registered' | 'Attended' | 'Absent',
  verifiedBy?: string
): Promise<void> {
  const path = `registrations/${regId}`;
  try {
    const docRef = doc(db, 'registrations', regId);
    const updateData: Record<string, any> = { status };
    if (status === 'Attended') {
      updateData.attendedAt = new Date().toISOString();
      if (verifiedBy) {
        updateData.verifiedBy = verifiedBy;
      }

      // Notify student immediately of verified attendance
      getDoc(docRef).then(snap => {
        if (snap.exists()) {
          const reg = snap.data() as EventRegistration;
          sendAppNotification({
            tenantId: reg.tenantId || 'cse-aiml',
            userId: reg.studentId,
            title: '✅ Attendance Marked & Confirmed!',
            message: `Your entry pass has been scanned and verified${verifiedBy ? ` by ${verifiedBy}` : ''}. You are officially marked PRESENT!`,
            type: 'attendance',
            link: `/events/${reg.eventId}`
          });
        }
      }).catch(e => console.warn('Attendance notification dispatch note:', e));
    }
    await updateDoc(docRef, updateData);

    await writeAuditLog({
      action: 'registration.update',
      entityType: 'registration',
      entityId: regId,
      details: `Updated registration ${regId} status to "${status}"${verifiedBy ? ` (verified by ${verifiedBy})` : ''}.`,
      severity: status === 'Attended' ? 'info' : 'warning'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}


export async function updateRegistrationTeamMembers(regId: string, teamMembers: TeamMember[]): Promise<void> {
  const path = `registrations/${regId}`;
  try {
    const docRef = doc(db, 'registrations', regId);
    await updateDoc(docRef, { teamMembers: cleanUndefined(teamMembers) });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteRegistration(registrationId: string, actor?: Partial<AuditActor>): Promise<void> {
  try {
    const regRef = doc(db, 'registrations', registrationId);
    const regSnap = await getDoc(regRef);
    if (regSnap.exists()) {
      const regData = regSnap.data() as EventRegistration;
      if (regData.eventId) {
        const eventRef = doc(db, 'events', regData.eventId);
        await runTransaction(db, async (txn) => {
          const evSnap = await txn.get(eventRef);
          if (evSnap.exists()) {
            const evData = evSnap.data() as DepartmentEvent;
            const current = evData.currentRegistrations || 0;
            if (current > 0) {
              txn.update(eventRef, { currentRegistrations: current - 1 });
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('Could not decrement event registration count:', err);
  }
  await softDelete('registrations', registrationId, 'registration', actor);
}



// Gallery
export async function fetchAlbums(tenantId?: string): Promise<Album[]> {
  try {
    const cleanTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
    const q = cleanTid
      ? query(collection(db, 'albums'), where('tenantId', '==', cleanTid))
      : collection(db, 'albums');
    const querySnapshot = await getDocs(q);
    const items: Album[] = [];
    querySnapshot.forEach((doc) => {
      items.push(doc.data() as Album);
    });
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'albums');
    return [];
  }
}

export async function addAlbum(item: Album): Promise<void> {
  const path = `albums/${item.albumId}`;
  try {
    const docRef = doc(db, 'albums', item.albumId);
    const finalAlbum = {
      ...item,
      tenantId: item.tenantId || getActiveTenantId()
    };
    await setDoc(docRef, cleanUndefined(finalAlbum));

    await writeAuditLog({
      action: 'album.create',
      tenantId: finalAlbum.tenantId,
      entityType: 'album',
      entityId: finalAlbum.albumId,
      entityName: finalAlbum.title,
      details: `Created gallery album "${finalAlbum.title}" (${finalAlbum.images?.length || 0} photos).`,
      severity: 'info'
    });

    broadcastAppNotification({
      tenantId: finalAlbum.tenantId,
      title: '📸 New Photo Gallery Published!',
      message: `Event memories & photos added for "${finalAlbum.title}". Open gallery to explore!`,
      type: 'gallery',
      link: '/gallery'
    }).catch(e => console.warn('Gallery notification note:', e));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAlbum(albumId: string, updates: Partial<Album>): Promise<void> {
  const path = `albums/${albumId}`;
  try {
    const docRef = doc(db, 'albums', albumId);
    await updateDoc(docRef, cleanUndefined(updates) as any);

    await writeAuditLog({
      action: 'album.update',
      entityType: 'album',
      entityId: albumId,
      entityName: updates.title || albumId,
      details: `Updated gallery album "${updates.title || albumId}".`,
      severity: 'info'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAlbum(albumId: string, actor?: Partial<AuditActor>): Promise<void> {
  await softDelete('albums', albumId, 'album', actor);
}


// Announcements
export async function fetchAnnouncements(tenantId?: string): Promise<Announcement[]> {
  try {
    const cleanTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
    const q = cleanTid
      ? query(collection(db, 'announcements'), where('tenantId', '==', cleanTid))
      : collection(db, 'announcements');
    const querySnapshot = await getDocs(q);
    const items: Announcement[] = [];
    querySnapshot.forEach((doc) => {
      items.push(doc.data() as Announcement);
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'announcements');
    return [];
  }
}

export async function createAnnouncement(announce: Announcement): Promise<void> {
  const path = `announcements/${announce.announcementId}`;
  try {
    const docRef = doc(db, 'announcements', announce.announcementId);
    const finalAnnounce = {
      ...announce,
      tenantId: announce.tenantId || getActiveTenantId()
    };
    await setDoc(docRef, cleanUndefined(finalAnnounce));

    await writeAuditLog({
      action: 'announcement.create',
      tenantId: finalAnnounce.tenantId,
      entityType: 'announcement',
      entityId: finalAnnounce.announcementId,
      entityName: finalAnnounce.title,
      details: `Published announcement "${finalAnnounce.title}" by ${finalAnnounce.author}.`,
      severity: 'info'
    });

    broadcastAppNotification({
      tenantId: finalAnnounce.tenantId,
      title: `📢 Announcement: ${finalAnnounce.title}`,
      message: finalAnnounce.content.substring(0, 100) + (finalAnnounce.content.length > 100 ? '...' : ''),
      type: 'announcement',
      link: '/announcements'
    }).catch(e => console.warn('Announcement notification note:', e));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}


// Deletions
export async function updateEvent(event: DepartmentEvent): Promise<void> {
  const path = `events/${event.eventId}`;
  try {
    const docRef = doc(db, 'events', event.eventId);
    await setDoc(docRef, cleanUndefined(event), { merge: true });

    await writeAuditLog({
      action: 'event.update',
      tenantId: event.tenantId,
      entityType: 'event',
      entityId: event.eventId,
      entityName: event.title,
      details: `Updated details for event "${event.title}".`,
      severity: 'info'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}


export async function deleteEvent(eventId: string, actor?: Partial<AuditActor>): Promise<void> {
  // Cascades deletion of all child records (passes/registrations, certificates, winners) and backs them up
  return cascadeDeleteEvent(eventId, actor);
}

export async function deleteAnnouncement(announcementId: string, actor?: Partial<AuditActor>): Promise<void> {
  await softDelete('announcements', announcementId, 'announcement', actor);
}




// Per-tenant config doc ID helper
function getConfigDocId(tenantId?: string): string {
  const tid = (tenantId || getActiveTenantId()).trim().toLowerCase();
  return `config_${tid}`;
}

function getTenantBrandingCacheKey(tenantId?: string): string {
  const tid = (tenantId || getActiveTenantId()).trim().toLowerCase();
  return tid ? `notx_branding_${tid}` : 'notx_branding';
}

export async function getAppConfig(tenantId?: string): Promise<AppConfig> {
  const docId = getConfigDocId(tenantId);
  const path = `appSettings/${docId}`;
  const cleanTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
  try {
    const configDocRef = doc(db, 'appSettings', docId);
    const configSnap = await getDoc(configDocRef);
    if (!configSnap.exists()) {
      // Look up tenant from 'tenants' collection to get their specific pristine allotted branding
      // NEVER clone from the global legacy 'config' document to prevent cross-tenant leakage!
      let tenantBranding: AppBranding = DEFAULT_BRANDING;
      let tenantSupport: SupportInfo = DEFAULT_SUPPORT_INFO;
      if (cleanTid) {
        try {
          const tSnap = await getDoc(doc(db, 'tenants', cleanTid));
          if (tSnap.exists()) {
            const tData = tSnap.data() as Tenant;
            if (tData.branding) tenantBranding = tData.branding;
            if (tData.supportInfo) tenantSupport = tData.supportInfo;
          }
        } catch (e) {}
      }
      const defaultConfig: AppConfig = { 
        isCertificatesEnabled: true,
        certificateTemplate: DEFAULT_CERTIFICATE_TEMPLATE,
        supportInfo: tenantSupport,
        branding: tenantBranding,
        tenantId: cleanTid
      };
      await setDoc(configDocRef, cleanUndefined(defaultConfig));
      return defaultConfig;
    }
    return normalizeAppConfig(configSnap.data() as AppConfig);
  } catch (error) {
    console.error('Error getting app config:', error);
    return { 
      isCertificatesEnabled: true,
      certificateTemplate: DEFAULT_CERTIFICATE_TEMPLATE,
      supportInfo: DEFAULT_SUPPORT_INFO,
      branding: DEFAULT_BRANDING
    };
  }
}

function normalizeAppConfig(data: AppConfig): AppConfig {
  if (!data.supportInfo) data.supportInfo = DEFAULT_SUPPORT_INFO;
  if (data.isCertificatesEnabled === undefined) data.isCertificatesEnabled = true;
  if (!data.certificateTemplate) data.certificateTemplate = DEFAULT_CERTIFICATE_TEMPLATE;
  if (!data.branding) data.branding = DEFAULT_BRANDING;
  return data;
}

export async function toggleCertificatesEnabled(isCertificatesEnabled: boolean, tenantId?: string): Promise<void> {
  const docId = getConfigDocId(tenantId);
  const path = `appSettings/${docId}`;
  try {
    const configDocRef = doc(db, 'appSettings', docId);
    await setDoc(configDocRef, { isCertificatesEnabled }, { merge: true });
  } catch (error) {
    console.error('Error toggling certificates enabled:', error);
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function updateCertificateTemplate(template: Partial<CertificateTemplate>, tenantId?: string): Promise<void> {
  const docId = getConfigDocId(tenantId);
  const path = `appSettings/${docId}`;
  try {
    const configDocRef = doc(db, 'appSettings', docId);
    await setDoc(configDocRef, { 
      certificateTemplate: cleanUndefined({
        ...DEFAULT_CERTIFICATE_TEMPLATE,
        ...template,
        updatedAt: new Date().toISOString()
      }) 
    }, { merge: true });
  } catch (error) {
    console.error('Error updating certificate template:', error);
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function updateSupportInfo(supportInfo: Partial<SupportInfo>, tenantId?: string): Promise<void> {
  const docId = getConfigDocId(tenantId);
  const path = `appSettings/${docId}`;
  try {
    const configDocRef = doc(db, 'appSettings', docId);
    await setDoc(configDocRef, { 
      supportInfo: cleanUndefined({
        ...DEFAULT_SUPPORT_INFO,
        ...supportInfo,
        updatedAt: new Date().toISOString()
      }) 
    }, { merge: true });
  } catch (error) {
    console.error('Error updating support info:', error);
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function updateAppBranding(branding: Partial<AppBranding>, tenantId?: string): Promise<void> {
  const docId = getConfigDocId(tenantId);
  const path = `appSettings/${docId}`;
  try {
    const configDocRef = doc(db, 'appSettings', docId);
    const existing = await getAppConfig(tenantId);
    const updatedBranding = cleanUndefined({
      ...DEFAULT_BRANDING,
      ...(existing.branding || {}),
      ...branding,
      updatedAt: new Date().toISOString()
    });
    try {
      localStorage.setItem(getTenantBrandingCacheKey(tenantId), JSON.stringify(updatedBranding));
    } catch (e) {}
    await setDoc(configDocRef, { 
      branding: updatedBranding
    }, { merge: true });

    // Step 1: Also synchronize the 'tenants' collection document
    // Ensures LoginView (which subscribes to 'tenants') and App.tsx (which loads activeTenant)
    // immediately display the new crest photo, logo image, and branding dynamic properties
    const effectiveTenantId = (tenantId || getActiveTenantId() || '').trim().toLowerCase();
    if (effectiveTenantId) {
      try {
        const tenantDocRef = doc(db, 'tenants', effectiveTenantId);
        const tenantSnap = await getDoc(tenantDocRef);
        if (tenantSnap.exists()) {
          const tenantData = tenantSnap.data() as Tenant;
          const mergedTenantBranding = cleanUndefined({
            ...(tenantData.branding || {}),
            ...updatedBranding
          });
          await updateDoc(tenantDocRef, {
            branding: mergedTenantBranding
          });
        }
      } catch (tenantErr) {
        console.warn('Tenant collection branding sync note:', tenantErr);
      }
    }
  } catch (error) {
    console.error('Error updating app branding:', error);
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export function subscribeToAppConfig(callback: (config: AppConfig) => void, tenantId?: string): () => void {
  const docId = getConfigDocId(tenantId);
  const cacheKey = getTenantBrandingCacheKey(tenantId);
  const configDocRef = doc(db, 'appSettings', docId);
  return onSnapshot(configDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as AppConfig;
      if (!data.branding) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try { data.branding = JSON.parse(cached); } catch (e) { data.branding = DEFAULT_BRANDING; }
        } else {
          data.branding = DEFAULT_BRANDING;
        }
      } else {
        try { localStorage.setItem(cacheKey, JSON.stringify(data.branding)); } catch (e) {}
      }
      if (!data.supportInfo) data.supportInfo = DEFAULT_SUPPORT_INFO;
      if (!data.certificateTemplate) data.certificateTemplate = DEFAULT_CERTIFICATE_TEMPLATE;
      if (data.isCertificatesEnabled === undefined) data.isCertificatesEnabled = true;
      callback(data);
    } else {
      const cached = localStorage.getItem(cacheKey);
      let fallbackBranding = DEFAULT_BRANDING;
      if (cached) {
        try { fallbackBranding = JSON.parse(cached); } catch (e) {}
      }
      callback({
        isCertificatesEnabled: true,
        certificateTemplate: DEFAULT_CERTIFICATE_TEMPLATE,
        supportInfo: DEFAULT_SUPPORT_INFO,
        branding: fallbackBranding
      });
    }
  }, (err) => {
    console.error('Error in subscribeToAppConfig:', err);
  });
}

// ---------------- PLATFORM MASTER BRANDING (SUPER ADMIN CONTROLLED) ----------------
export const DEFAULT_PLATFORM_BRANDING: AppBranding = {
  appName: "NOTX",
  tagline: "Connect",
  subtitle: "Unified Multi-Tenant Academic OS",
  institution: "Academic SaaS Ecosystem",
  loginHeroText: "Universal department pass verification, live notifications, and digital credentials.",
  logoType: "preset",
  logoIcon: "Cpu",
  logoImageUrl: "",
  accentColor: "indigo"
};

export async function getPlatformBranding(): Promise<AppBranding> {
  try {
    const snap = await getDoc(doc(db, 'appSettings', 'platform_branding'));
    if (snap.exists()) {
      return { ...DEFAULT_PLATFORM_BRANDING, ...snap.data() } as AppBranding;
    }
    const cached = localStorage.getItem('notx_platform_branding');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return DEFAULT_PLATFORM_BRANDING;
  } catch (err) {
    console.warn('Error reading platform branding, falling back to default:', err);
    return DEFAULT_PLATFORM_BRANDING;
  }
}

export async function updatePlatformBranding(branding: Partial<AppBranding>): Promise<void> {
  try {
    const ref = doc(db, 'appSettings', 'platform_branding');
    const existing = await getPlatformBranding();
    const updated = cleanUndefined({
      ...DEFAULT_PLATFORM_BRANDING,
      ...existing,
      ...branding,
      updatedAt: new Date().toISOString()
    });
    try {
      localStorage.setItem('notx_platform_branding', JSON.stringify(updated));
    } catch (e) {}
    await setDoc(ref, updated, { merge: true });
  } catch (error) {
    console.error('Error updating platform branding:', error);
    handleFirestoreError(error, OperationType.UPDATE, 'appSettings/platform_branding');
    throw error;
  }
}

export function subscribeToPlatformBranding(callback: (branding: AppBranding) => void): () => void {
  const ref = doc(db, 'appSettings', 'platform_branding');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = { ...DEFAULT_PLATFORM_BRANDING, ...snap.data() } as AppBranding;
      try { localStorage.setItem('notx_platform_branding', JSON.stringify(data)); } catch (e) {}
      callback(data);
    } else {
      callback(DEFAULT_PLATFORM_BRANDING);
    }
  }, (err) => {
    console.warn('subscribeToPlatformBranding error:', err);
    callback(DEFAULT_PLATFORM_BRANDING);
  });
}

export interface SystemBackupData {
  meta: {
    exportDate: string;
    version: string;
    exportedBy?: string;
    totalRecords: number;
    department: string;
  };
  counts: Record<string, number>;
  collections: {
    users: UserProfile[];
    events: DepartmentEvent[];
    registrations: EventRegistration[];
    certificates: IssuedCertificate[];
    event_winners: EventWinner[];
    announcements: Announcement[];
    albums: Album[];
    gallery: any[];
    notifications: any[];
    appSettings: any[];
  };
}

export async function exportAllDatabaseData(exportedByName?: string, tenantId?: string): Promise<SystemBackupData> {
  const activeTenant = tenantId || getActiveTenantId();
  const collectionNames = [
    'users',
    'events',
    'registrations',
    'certificates',
    'event_winners',
    'announcements',
    'albums',
    'gallery',
    'notifications',
    'appSettings'
  ];

  const backupData: SystemBackupData = {
    meta: {
      exportDate: new Date().toISOString(),
      version: '2.0.0',
      exportedBy: exportedByName || 'Department Administrator',
      totalRecords: 0,
      department: activeTenant ? `Tenant: ${activeTenant}` : 'All Tenants'
    },
    counts: {},
    collections: {
      users: [],
      events: [],
      registrations: [],
      certificates: [],
      event_winners: [],
      announcements: [],
      albums: [],
      gallery: [],
      notifications: [],
      appSettings: []
    }
  };

  for (const name of collectionNames) {
    try {
      const snap = await getDocs(collection(db, name));
      const items: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (!activeTenant || data.tenantId === activeTenant) {
          items.push(data);
        }
      });
      (backupData.collections as any)[name] = items;
      backupData.counts[name] = items.length;
      backupData.meta.totalRecords += items.length;
    } catch (err) {
      console.warn(`Could not export collection ${name}:`, err);
      backupData.counts[name] = 0;
    }
  }

  return backupData;
}

export interface ResetSummary {
  deletedCounts: Record<string, number>;
  preservedAdmin: {
    uid: string;
    name: string;
    email: string;
  };
  resetTimestamp: string;
}

export async function resetEntireDatabaseForNewAssociation(
  currentAdmin: UserProfile,
  tenantIdOrProgress?: string | ((stage: string, percent: number) => void),
  maybeProgress?: (stage: string, percent: number) => void
): Promise<ResetSummary> {
  const tenantId = typeof tenantIdOrProgress === 'string' ? tenantIdOrProgress : (currentAdmin.tenantId || getActiveTenantId());
  const onProgress = typeof tenantIdOrProgress === 'function' ? tenantIdOrProgress : maybeProgress;

  const summary: ResetSummary = {
    deletedCounts: {},
    preservedAdmin: {
      uid: currentAdmin.uid,
      name: currentAdmin.name,
      email: currentAdmin.email
    },
    resetTimestamp: new Date().toISOString()
  };

  // Step 0: Pre-reset system backup in Deleted Vault
  try {
    onProgress?.('Creating pre-reset system backup in Deleted Vault...', 2);
    const fullSnapshot = await exportAllDatabaseData(tenantId);
    const backupId = `bk_reset_${tenantId || 'global'}_${Date.now()}`;
    await setDoc(doc(db, 'deleted_backups', backupId), cleanUndefined({
      backupId,
      entityType: 'association_reset',
      entityId: backupId,
      entityName: `Full Association Reset Archive (${tenantId})`,
      tenantId: tenantId || 'cse-aiml',
      deletedBy: {
        uid: currentAdmin.uid,
        email: currentAdmin.email,
        name: currentAdmin.name,
        role: currentAdmin.role
      },
      deletedAt: new Date().toISOString(),
      originalData: fullSnapshot
    }));

    await writeAuditLog({
      action: 'system.reset',
      actor: {
        uid: currentAdmin.uid,
        email: currentAdmin.email,
        name: currentAdmin.name,
        role: currentAdmin.role
      },
      tenantId: tenantId || 'cse-aiml',
      entityType: 'association_reset',
      entityId: backupId,
      entityName: `Database Reset (${tenantId})`,
      details: `Association reset initiated for tenant ${tenantId}. Archived ${fullSnapshot.meta.totalRecords} records to Deleted Vault.`,
      severity: 'critical'
    });
  } catch (bkErr) {
    console.warn('Pre-reset archive warning:', bkErr);
  }

  // Step 1: Delete only docs that belong to this tenant
  const collectionsToWipe = [

    'events',
    'registrations',
    'certificates',
    'event_winners',
    'announcements',
    'albums',
    'gallery',
    'notifications'
  ];

  let completedSteps = 0;
  const totalSteps = collectionsToWipe.length + 2;

  for (const collName of collectionsToWipe) {
    onProgress?.(`Wiping ${collName}...`, Math.round((completedSteps / totalSteps) * 100));
    try {
      const snap = await getDocs(collection(db, collName));
      // Only delete documents belonging to this tenant
      const toDelete = snap.docs.filter(d => {
        const data = d.data();
        return tenantId ? data.tenantId === tenantId : false;
      });
      const count = toDelete.length;
      const promises = toDelete.map(d => deleteDoc(doc(db, collName, d.id)));
      await Promise.all(promises);
      summary.deletedCounts[collName] = count;
    } catch (err) {
      console.error(`Error wiping collection ${collName}:`, err);
      summary.deletedCounts[collName] = 0;
    }
    completedSteps++;
  }

  // Step 2: Wipe users belonging to this tenant, except current admin and root admin
  onProgress?.('Cleaning student and member accounts...', Math.round((completedSteps / totalSteps) * 100));
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let userDeletedCount = 0;
    const userDeletePromises: Promise<any>[] = [];

    usersSnap.forEach(d => {
      const u = d.data() as UserProfile;
      const belongsToTenant = u.tenantId === tenantId;
      const isCurrentAdmin = u.uid === currentAdmin.uid || (u.email && currentAdmin.email && u.email.toLowerCase() === currentAdmin.email.toLowerCase());
      const isRootAdmin = u.isSuperAdmin;

      if (belongsToTenant && !isCurrentAdmin && !isRootAdmin) {
        userDeletePromises.push(deleteDoc(doc(db, 'users', d.id)));
        userDeletedCount++;
      }
    });

    await Promise.all(userDeletePromises);
    summary.deletedCounts['users'] = userDeletedCount;
  } catch (err) {
    console.error('Error cleaning users collection:', err);
    summary.deletedCounts['users'] = 0;
  }
  completedSteps++;

  // Step 3: Ensure current admin profile is clean and healthy
  onProgress?.('Re-initializing clean administrator state...', 95);
  try {
    const cleanAdminProfile: UserProfile = {
      ...currentAdmin,
      tenantId,
      role: 'admin',
      position: 'Head Administrator',
      assignedEvents: [],
      powers: {
        canManageEvents: true,
        canManageAnnouncements: true,
        canViewRegistrations: true,
        canManageGallery: true
      }
    };
    await setDoc(doc(db, 'users', currentAdmin.uid), cleanUndefined(cleanAdminProfile));
  } catch (err) {
    console.error('Error re-initializing admin profile:', err);
  }

  // Clear local storage items that might hold cached event/user state
  try {
    localStorage.removeItem('active_event_draft');
    localStorage.removeItem('selected_event_id');
    localStorage.removeItem('qr_scan_recent');
  } catch (e) {
    // ignore
  }

  onProgress?.('Association reset complete!', 100);
  return summary;
}

export const clearAllDatabaseData = async () => {
  const collections = ['users', 'events', 'registrations', 'albums', 'announcements', 'certificates', 'event_winners', 'gallery', 'notifications'];
  
  for (const collectionName of collections) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const deletePromises = querySnapshot.docs.map(docSnapshot => deleteDoc(doc(db, collectionName, docSnapshot.id)));
    await Promise.all(deletePromises);
  }
};

// ==========================================
// E-CERTIFICATE DATABASE & ISSUANCE SYSTEM
// ==========================================

export function generateCertificateId(rollNumber?: string, eventId?: string, tenantShortCode?: string): string {
  const cleanRoll = (rollNumber || 'STU').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const shortRoll = cleanRoll.length > 6 ? cleanRoll.slice(-6) : cleanRoll;
  const cleanEvt = (eventId || 'GEN').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  const rawPrefix = tenantShortCode || getActiveTenantShortCode() || 'ORG';
  const prefix = rawPrefix.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'ORG';
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CERT-${prefix}-${shortRoll}-${cleanEvt}-${randomSuffix}`;
}

export async function issueCertificate(certData: Omit<IssuedCertificate, 'issuedAt'>, tenantShortCode?: string): Promise<IssuedCertificate> {
  const tId = certData.tenantId || getActiveTenantId();
  const effectiveShortCode = tenantShortCode || (tId ? tId.replace(/^dept-/, '').split('-').pop()?.toUpperCase() : undefined);
  const certId = certData.certificateId || generateCertificateId(certData.rollNumber, certData.eventId, effectiveShortCode);
  const path = `certificates/${certId}`;
  
  const fullCert: IssuedCertificate = {
    ...certData,
    certificateId: certId,
    tenantId: tId,
    issuedAt: new Date().toISOString(),
    status: certData.status || 'Issued',
    issueDate: certData.issueDate || new Date().toISOString().split('T')[0],
    qrVerificationData: certData.qrVerificationData || `https://notx-connect.edu/verify?id=${certId}`
  };

  try {
    const certDocRef = doc(db, 'certificates', certId);
    await setDoc(certDocRef, cleanUndefined(fullCert));

    await writeAuditLog({
      action: 'certificate.issue',
      tenantId: fullCert.tenantId,
      entityType: 'certificate',
      entityId: certId,
      entityName: `${fullCert.studentName} (${fullCert.rollNumber})`,
      details: `Issued verified certificate ${certId} for event "${fullCert.eventTitle}" to ${fullCert.studentName}.`,
      severity: 'info'
    });

    return fullCert;
  } catch (error) {

    console.error('Error issuing certificate:', error);
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function fetchCertificates(tenantId?: string): Promise<IssuedCertificate[]> {
  const path = 'certificates';
  try {
    const filterTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
    const q = filterTid
      ? query(collection(db, 'certificates'), where('tenantId', '==', filterTid))
      : collection(db, 'certificates');
    const querySnapshot = await getDocs(q);
    const certs: IssuedCertificate[] = [];
    querySnapshot.forEach(docSnap => {
      certs.push(docSnap.data() as IssuedCertificate);
    });
    // Sort by issuedAt descending
    return certs.sort((a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime());
  } catch (error) {
    console.error('Error fetching certificates:', error);
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToCertificates(callback: (certs: IssuedCertificate[]) => void, tenantId?: string): () => void {
  const path = 'certificates';
  const filterTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
  const q = filterTid
    ? query(collection(db, 'certificates'), where('tenantId', '==', filterTid))
    : collection(db, 'certificates');
  return onSnapshot(
    q,
    (snapshot) => {
      const certs: IssuedCertificate[] = [];
      snapshot.forEach(docSnap => {
        certs.push(docSnap.data() as IssuedCertificate);
      });
      certs.sort((a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime());
      callback(certs);
    },
    (error) => {
      console.error('Error subscribing to certificates:', error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function fetchCertificatesByEvent(eventId: string): Promise<IssuedCertificate[]> {
  const path = 'certificates';
  try {
    const q = query(collection(db, 'certificates'), where('eventId', '==', eventId));
    const snapshot = await getDocs(q);
    const certs: IssuedCertificate[] = [];
    snapshot.forEach(docSnap => {
      certs.push(docSnap.data() as IssuedCertificate);
    });
    return certs.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
  } catch (error) {
    console.error('Error fetching certificates by event:', error);
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function fetchCertificatesByStudent(studentId: string, rollNumber?: string): Promise<IssuedCertificate[]> {
  const path = 'certificates';
  try {
    const certs: IssuedCertificate[] = [];
    const q1 = query(collection(db, 'certificates'), where('studentId', '==', studentId));
    const snap1 = await getDocs(q1);
    snap1.forEach(docSnap => certs.push(docSnap.data() as IssuedCertificate));

    if (rollNumber) {
      const q2 = query(collection(db, 'certificates'), where('rollNumber', '==', rollNumber));
      const snap2 = await getDocs(q2);
      snap2.forEach(docSnap => {
        if (!certs.some(c => c.certificateId === docSnap.id)) {
          certs.push(docSnap.data() as IssuedCertificate);
        }
      });
    }

    return certs;
  } catch (error) {
    console.error('Error fetching certificates by student:', error);
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function verifyCertificateById(certificateId: string): Promise<IssuedCertificate | null> {
  const cleanId = (certificateId || '').trim();
  if (!cleanId) return null;
  const path = `certificates/${cleanId}`;
  try {
    const docRef = doc(db, 'certificates', cleanId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as IssuedCertificate;
    }
    // Also try case-insensitive / search match if users enter without dashes or lowercase
    const allCerts = await fetchCertificates();
    const match = allCerts.find(c => 
      c.certificateId.toLowerCase() === cleanId.toLowerCase() ||
      c.certificateId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    );
    return match || null;
  } catch (error) {
    console.error('Error verifying certificate:', error);
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function deleteCertificate(certificateId: string, actor?: Partial<AuditActor>): Promise<void> {
  await softDelete('certificates', certificateId, 'certificate', actor);
}


export async function syncCertificatesForAttendees(
  events: DepartmentEvent[],
  registrations: EventRegistration[],
  allUsers: UserProfile[],
  tenantId?: string
): Promise<{ newlyIssued: number; totalEligible: number }> {
  // Find all attended registrations
  const attendedRegs = registrations.filter(r => r.status === 'Attended');
  if (attendedRegs.length === 0) {
    return { newlyIssued: 0, totalEligible: 0 };
  }

  // Get currently issued certificates to avoid duplicates (tenant-scoped)
  const existingCerts = await fetchCertificates(tenantId);
  let newlyIssued = 0;

  for (const reg of attendedRegs) {
    const matchedEvent = events.find(e => e.eventId === reg.eventId);
    if (!matchedEvent) continue;

    // Check if certificate already exists for this student & event
    const exists = existingCerts.some(c => 
      c.eventId === reg.eventId && 
      (c.studentId === reg.studentId || (reg.rollNumber && c.rollNumber.toUpperCase() === reg.rollNumber.toUpperCase()))
    );

    if (!exists) {
      const studentUser = allUsers.find(u => u.uid === reg.studentId || (reg.rollNumber && u.rollNumber?.toUpperCase() === reg.rollNumber.toUpperCase()));
      const effectiveTid = tenantId || getActiveTenantId();
      const derivedCode = effectiveTid ? effectiveTid.replace(/^dept-/, '').split('-').pop()?.toUpperCase() : undefined;
      const certId = generateCertificateId(reg.rollNumber || studentUser?.rollNumber, matchedEvent.eventId, derivedCode);
      
      const newCert: Omit<IssuedCertificate, 'issuedAt'> = {
        certificateId: certId,
        eventId: matchedEvent.eventId,
        eventTitle: matchedEvent.title,
        eventDate: matchedEvent.date,
        eventVenue: matchedEvent.venue,
        studentId: reg.studentId || studentUser?.uid || 'student_' + (reg.rollNumber || 'unknown'),
        studentName: reg.studentName || studentUser?.name || 'Student Participant',
        rollNumber: reg.rollNumber || studentUser?.rollNumber || 'N/A',
        tenantId: effectiveTid,
        department: studentUser?.department || '',
        year: studentUser?.year || reg.year || '',
        section: studentUser?.section || '',
        issueDate: matchedEvent.date || new Date().toISOString().split('T')[0],
        status: 'Issued',
        issuedBy: 'Department Administration',
        qrVerificationData: `https://notx-connect.edu/verify?id=${certId}`
      };

      await issueCertificate(newCert);
      newlyIssued++;
    }
  }

  return { newlyIssued, totalEligible: attendedRegs.length };
}

export async function generateBatchCertificatesForEvent(
  eventId: string,
  options?: {
    specificStudentIds?: string[];
    issuedBy?: string;
    events?: DepartmentEvent[];
    registrations?: EventRegistration[];
    allUsers?: UserProfile[];
    tenantId?: string;
  },
  tenantId?: string
): Promise<{ newlyIssued: number; totalAttended: number; alreadyIssued: number }> {
  const tid = tenantId || options?.tenantId || getActiveTenantId();
  // Get all registrations and events if not provided
  let allRegs = options?.registrations;
  if (!allRegs) {
    allRegs = await fetchRegistrations(tid);
  }
  let allEvs = options?.events;
  if (!allEvs) {
    allEvs = await fetchEvents(tid);
  }
  let usersList = options?.allUsers;
  if (!usersList) {
    usersList = await fetchUsers(tid);
  }

  const matchedEvent = allEvs.find(e => e.eventId === eventId);
  if (!matchedEvent) {
    throw new Error(`Event ${eventId} not found.`);
  }

  // Filter registrations for this event with 'Attended' status
  let eventAttendedRegs = allRegs.filter(r => r.eventId === eventId && r.status === 'Attended');
  if (options?.specificStudentIds && options.specificStudentIds.length > 0) {
    const filterSet = new Set(options.specificStudentIds);
    eventAttendedRegs = eventAttendedRegs.filter(r => filterSet.has(r.studentId) || (r.rollNumber && filterSet.has(r.rollNumber.toUpperCase())));
  }

  const existingCerts = await fetchCertificates(tid);
  let newlyIssued = 0;
  let alreadyIssued = 0;

  for (const reg of eventAttendedRegs) {
    // Check if certificate already exists
    const exists = existingCerts.some(c => 
      c.eventId === eventId && 
      (c.studentId === reg.studentId || (reg.rollNumber && c.rollNumber.toUpperCase() === reg.rollNumber.toUpperCase()))
    );

    if (exists) {
      alreadyIssued++;
      continue;
    }

    const studentUser = usersList.find(u => u.uid === reg.studentId || (reg.rollNumber && u.rollNumber?.toUpperCase() === reg.rollNumber.toUpperCase()));
    const derivedCode = tid ? tid.replace(/^dept-/, '').split('-').pop()?.toUpperCase() : undefined;
    const certId = generateCertificateId(reg.rollNumber || studentUser?.rollNumber, matchedEvent.eventId, derivedCode);

    const newCert: Omit<IssuedCertificate, 'issuedAt'> = {
      certificateId: certId,
      eventId: matchedEvent.eventId,
      eventTitle: matchedEvent.title,
      eventDate: matchedEvent.date,
      eventVenue: matchedEvent.venue || 'Campus Auditorium',
      tenantId: tid,
      studentId: reg.studentId || studentUser?.uid || 'student_' + (reg.rollNumber || 'unknown'),
      studentName: reg.studentName || studentUser?.name || 'Student Participant',
      rollNumber: reg.rollNumber || studentUser?.rollNumber || 'N/A',
      department: studentUser?.department || '',
      year: studentUser?.year || reg.year || '',
      section: studentUser?.section || '',
      issueDate: matchedEvent.date || new Date().toISOString().split('T')[0],
      status: 'Issued',
      issuedBy: options?.issuedBy || 'Department Administration',
      qrVerificationData: `https://notx-connect.edu/verify?id=${certId}`
    };

    await issueCertificate(newCert);
    newlyIssued++;
  }

  return { newlyIssued, totalAttended: eventAttendedRegs.length, alreadyIssued };
}

export async function revokeBatchCertificatesForEvent(
  eventId: string,
  specificStudentIds?: string[],
  tenantId?: string
): Promise<{ revokedCount: number }> {
  const existingCerts = await fetchCertificates(tenantId);
  const filterSet = specificStudentIds && specificStudentIds.length > 0 ? new Set(specificStudentIds) : null;

  const targetCerts = existingCerts.filter(c => {
    if (c.eventId !== eventId) return false;
    if (filterSet) {
      return filterSet.has(c.studentId) || (c.rollNumber && filterSet.has(c.rollNumber.toUpperCase()));
    }
    return true;
  });

  let revokedCount = 0;
  for (const cert of targetCerts) {
    await deleteCertificate(cert.certificateId);
    revokedCount++;
  }

  return { revokedCount };
}

// ---------------- EVENT WINNERS (HOME SPOTLIGHT) ----------------

export async function fetchEventWinners(tenantId?: string): Promise<EventWinner[]> {
  const path = 'event_winners';
  try {
    const filterTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
    const q = filterTid
      ? query(collection(db, 'event_winners'), where('tenantId', '==', filterTid))
      : collection(db, 'event_winners');
    const snap = await getDocs(q);
    const winners: EventWinner[] = [];
    snap.forEach((d) => {
      winners.push(d.data() as EventWinner);
    });
    // Sort by addedAt descending
    return winners.sort((a, b) => new Date(b.addedAt || '').getTime() - new Date(a.addedAt || '').getTime());
  } catch (error) {
    console.error('Error fetching event winners:', error);
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToEventWinners(callback: (winners: EventWinner[]) => void, tenantId?: string): () => void {
  const path = 'event_winners';
  const filterTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
  try {
    const q = filterTid
      ? query(collection(db, 'event_winners'), where('tenantId', '==', filterTid))
      : collection(db, 'event_winners');
    return onSnapshot(q, (snapshot) => {
      const winners: EventWinner[] = [];
      snapshot.forEach((d) => {
        winners.push(d.data() as EventWinner);
      });
      winners.sort((a, b) => new Date(b.addedAt || '').getTime() - new Date(a.addedAt || '').getTime());
      callback(winners);
    }, (error) => {
      console.error('Error subscribing to event winners:', error);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    console.error('Error setting up event winners subscription:', error);
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function addEventWinner(winnerData: Omit<EventWinner, 'winnerId' | 'addedAt'> & { winnerId?: string; addedAt?: string }): Promise<string> {
  const winnerId = winnerData.winnerId || `winner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `event_winners/${winnerId}`;
  try {
    const finalWinner: EventWinner = {
      ...winnerData,
      winnerId,
      tenantId: winnerData.tenantId || getActiveTenantId(),
      addedAt: winnerData.addedAt || new Date().toISOString()
    };
    await setDoc(doc(db, 'event_winners', winnerId), cleanUndefined(finalWinner));

    await writeAuditLog({
      action: 'winner.add',
      tenantId: finalWinner.tenantId,
      entityType: 'event_winner',
      entityId: winnerId,
      entityName: `${finalWinner.studentName} (${finalWinner.position})`,
      details: `Awarded ${finalWinner.position} to ${finalWinner.studentName} for event "${finalWinner.eventTitle}".`,
      severity: 'info'
    });

    return winnerId;
  } catch (error) {
    console.error('Error adding event winner:', error);
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateEventWinner(winnerId: string, winnerData: Partial<EventWinner>): Promise<void> {
  const path = `event_winners/${winnerId}`;
  try {
    await updateDoc(doc(db, 'event_winners', winnerId), cleanUndefined(winnerData));

    await writeAuditLog({
      action: 'winner.update',
      entityType: 'event_winner',
      entityId: winnerId,
      details: `Updated winner record ${winnerId}.`,
      severity: 'info'
    });
  } catch (error) {
    console.error('Error updating event winner:', error);
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}


export async function deleteEventWinner(winnerId: string, actor?: Partial<AuditActor>): Promise<void> {
  await softDelete('event_winners', winnerId, 'event_winner', actor);
}


// ---------------- PLATFORM BUILDERS & DEVELOPERS (SUPER ADMIN GLOBAL) ----------------
export async function getPlatformDevConfig(): Promise<PlatformDevConfig> {
  const cached = localStorage.getItem('notx_platform_devs');
  let fallback: PlatformDevConfig = DEFAULT_PLATFORM_DEV_CONFIG;
  if (cached) {
    try {
      fallback = JSON.parse(cached);
    } catch (e) {}
  }

  try {
    const docRef = doc(db, 'platformSettings', 'developers');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as PlatformDevConfig;
      if (data && data.members && data.members.length > 0) {
        localStorage.setItem('notx_platform_devs', JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Firestore platformDevConfig read note:', err);
  }



  return fallback;
}

export async function updatePlatformDevConfig(config: PlatformDevConfig): Promise<void> {
  const sanitizedMembers = (config.members || []).map((m, idx) => ({
    id: m.id || `dev-${idx}`,
    name: m.name || '',
    rollNumber: m.rollNumber || '',
    role: m.role || '',
    department: m.department || '',
    bio: m.bio || '',
    specialty: m.specialty || '',
    badge: m.badge || 'BUILDER',
    badgeColor: m.badgeColor || 'amber',
    badgeStyle: m.badgeStyle || '',
    accentBg: m.accentBg || '',
    accentColor: m.accentColor || '',
    email: m.email || '',
    linkedin: m.linkedin || '',
    github: m.github || '',
    profilePic: m.profilePic || '',
    order: idx
  }));

  const cleanConfig: PlatformDevConfig = {
    sectionTitle: config.sectionTitle || DEFAULT_PLATFORM_DEV_CONFIG.sectionTitle,
    subtitle: config.subtitle || DEFAULT_PLATFORM_DEV_CONFIG.subtitle,
    badgeText: config.badgeText || DEFAULT_PLATFORM_DEV_CONFIG.badgeText,
    members: sanitizedMembers,
    updatedAt: new Date().toISOString()
  };

  // 1. Immediate local storage persistence (0ms delay)
  try {
    localStorage.setItem('notx_platform_devs', JSON.stringify(cleanConfig));
  } catch (e) {
    console.warn('localStorage platform dev save note:', e);
  }

  try {
    await Promise.allSettled([
      setDoc(doc(db, 'platformSettings', 'developers'), cleanUndefined(cleanConfig)),
      setDoc(doc(db, 'appSettings', 'platform_developers'), cleanUndefined(cleanConfig))
    ]);

    await writeAuditLog({
      action: 'system.config_update',
      entityType: 'platform_developers',
      entityId: 'developers',
      entityName: 'Platform Developers & Credits',
      details: 'Super Admin updated global platform developers and credit attribution config.',
      severity: 'warning'
    });
  } catch (e) {
    console.warn('updatePlatformDevConfig race note:', e);
  }
}


export function subscribeToPlatformDevConfig(callback: (config: PlatformDevConfig) => void): () => void {
  // Initial immediate notification from cache or default
  const cached = localStorage.getItem('notx_platform_devs');
  if (cached) {
    try {
      callback(JSON.parse(cached));
    } catch (e) {}
  } else {
    callback(DEFAULT_PLATFORM_DEV_CONFIG);
  }

  const unsubs: (() => void)[] = [];



  // 2. Listen in Firestore as fallback/parallel sync
  try {
    const unsubFirestore = onSnapshot(doc(db, 'platformSettings', 'developers'), (snap) => {
      if (snap.exists()) {
        const val = snap.data() as PlatformDevConfig;
        if (val && val.members && val.members.length > 0) {
          localStorage.setItem('notx_platform_devs', JSON.stringify(val));
          callback(val);
        }
      }
    }, (err) => {
      console.warn('Firestore platformDevConfig subscription note:', err);
    });
    unsubs.push(unsubFirestore);
  } catch (err) {
    console.warn('Failed setting up Firestore platformDevConfig subscription:', err);
  }

  return () => {
    unsubs.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
  };
}

// ==================== SUPPORT TICKETS & QUERY DESK ====================

export async function createSupportTicket(data: {
  tenantId: string;
  tenantName?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRoll?: string;
  userRollNumber?: string;
  category: TicketCategory;
  subject: string;
  message: string;
}): Promise<SupportTicket> {
  const tid = data.tenantId || getActiveTenantId();
  const readableId = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const roll = data.userRoll || data.userRollNumber || '';
  
  const ticketRef = doc(collection(db, 'support_tickets'));
  const newTicket: SupportTicket = {
    id: ticketRef.id,
    ticketId: readableId,
    readableId: readableId,
    tenantId: tid,
    tenantName: data.tenantName || 'Department',
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    userRoll: roll,
    userRollNumber: roll,
    category: data.category,
    subject: data.subject,
    message: data.message,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    unreadByAdmin: true,
    unreadByUser: false,
    replies: []
  };

  await setDoc(ticketRef, cleanUndefined(newTicket));

  try {
    await writeAuditLog({
      action: 'ticket.create' as any,
      severity: 'info',
      tenantId: tid,
      entityType: 'support_ticket',
      entityId: readableId,
      entityName: data.subject,
      details: `Student ${data.userName} (${roll || data.userEmail}) created support ticket #${readableId}: "${data.subject}".`
    });
  } catch (err) {
    console.warn('Audit note for ticket creation:', err);
  }

  return newTicket;
}

export function subscribeToUserTickets(userId: string, callback: (tickets: SupportTicket[]) => void): () => void {
  try {
    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const tickets: SupportTicket[] = [];
      snapshot.forEach((d) => {
        tickets.push({ id: d.id, ...d.data() } as SupportTicket);
      });
      tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(tickets);
    }, (error) => {
      console.error('Error subscribing to user tickets:', error);
      callback([]);
    });
  } catch (error) {
    console.error('Error initiating user tickets subscription:', error);
    callback([]);
    return () => {};
  }
}

export function subscribeToTenantTickets(tenantId: string, callback: (tickets: SupportTicket[]) => void): () => void {
  try {
    const q = query(
      collection(db, 'support_tickets'),
      where('tenantId', '==', tenantId)
    );
    return onSnapshot(q, (snapshot) => {
      const tickets: SupportTicket[] = [];
      snapshot.forEach((d) => {
        tickets.push({ id: d.id, ...d.data() } as SupportTicket);
      });
      tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(tickets);
    }, (error) => {
      console.error('Error subscribing to tenant tickets:', error);
      callback([]);
    });
  } catch (error) {
    console.error('Error initiating tenant tickets subscription:', error);
    callback([]);
    return () => {};
  }
}

export function subscribeToAllTickets(callback: (tickets: SupportTicket[]) => void): () => void {
  try {
    const q = collection(db, 'support_tickets');
    return onSnapshot(q, (snapshot) => {
      const tickets: SupportTicket[] = [];
      snapshot.forEach((d) => {
        tickets.push({ id: d.id, ...d.data() } as SupportTicket);
      });
      tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(tickets);
    }, (error) => {
      console.error('Error subscribing to all tickets:', error);
      callback([]);
    });
  } catch (error) {
    console.error('Error initiating all tickets subscription:', error);
    callback([]);
    return () => {};
  }
}

export async function addTicketReply(
  ticketId: string, 
  reply: {
    senderId: string;
    senderName: string;
    senderEmail: string;
    senderRole: string;
    message: string;
  },
  isStaffSender: boolean
): Promise<void> {
  const ticketRef = doc(db, 'support_tickets', ticketId);
  const snap = await getDoc(ticketRef);
  if (!snap.exists()) {
    throw new Error('Ticket not found');
  }

  const ticket = snap.data() as SupportTicket;
  const newReply: TicketReply = {
    replyId: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    senderId: reply.senderId,
    senderName: reply.senderName,
    senderEmail: reply.senderEmail,
    senderRole: reply.senderRole,
    message: reply.message,
    createdAt: new Date().toISOString()
  };

  const updatedReplies = [...(ticket.replies || []), newReply];
  const now = new Date().toISOString();

  const updates: Partial<SupportTicket> = {
    replies: updatedReplies,
    updatedAt: now,
    ...(isStaffSender 
      ? { 
          unreadByUser: true, 
          unreadByAdmin: false, 
          status: ticket.status === 'open' ? 'in_progress' : ticket.status 
        }
      : { 
          unreadByAdmin: true, 
          unreadByUser: false 
        })
  };

  await updateDoc(ticketRef, cleanUndefined(updates));
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  const ticketRef = doc(db, 'support_tickets', ticketId);
  await updateDoc(ticketRef, {
    status,
    updatedAt: new Date().toISOString()
  });
}

export async function markTicketRead(ticketId: string, reader: 'admin' | 'user'): Promise<void> {
  const ticketRef = doc(db, 'support_tickets', ticketId);
  if (reader === 'admin') {
    await updateDoc(ticketRef, { unreadByAdmin: false });
  } else {
    await updateDoc(ticketRef, { unreadByUser: false });
  }
}

export async function deleteSupportTicket(ticketId: string): Promise<void> {
  const ticketRef = doc(db, 'support_tickets', ticketId);
  await deleteDoc(ticketRef);
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS SYSTEM (Web Push & In-App Alerts)
// ─────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      sendBrowserNotification(
        '🔔 NOTX Live Alerts Enabled!',
        'You will now receive instant push alerts for attendance check-ins, event updates, and promotions.'
      );
    }
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

export async function sendBrowserNotification(title: string, body: string, url?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          reg.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/favicon.ico',
            data: { url: url || '/' }
          });
          return;
        }
      }
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/favicon.ico'
      });
    } catch (e) {
      console.warn('Browser notification note:', e);
    }
  }
}

export async function sendAppNotification(params: {
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: AppNotification['type'];
  link?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const cleanTid = params.tenantId ? params.tenantId.trim().toLowerCase() : 'cse-aiml';
  const notification: AppNotification = {
    id: notifId,
    tenantId: cleanTid,
    userId: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    link: params.link,
    read: false,
    createdAt: new Date().toISOString(),
    metadata: params.metadata
  };

  try {
    const docRef = doc(db, 'notifications', notifId);
    await setDoc(docRef, cleanUndefined(notification));
    
    // Trigger native browser notification if allowed
    sendBrowserNotification(params.title, params.message, params.link);
  } catch (error) {
    console.error('Failed to dispatch app notification:', error);
  }

  return notifId;
}

export async function broadcastAppNotification(params: {
  tenantId: string;
  title: string;
  message: string;
  type: AppNotification['type'];
  link?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  return sendAppNotification({
    ...params,
    userId: 'all'
  });
}

export function subscribeToUserNotifications(
  userId: string,
  tenantId: string,
  callback: (notifications: AppNotification[]) => void
): () => void {
  const cleanTid = tenantId ? tenantId.trim().toLowerCase() : '';
  const notifsCol = collection(db, 'notifications');
  
  const q = cleanTid
    ? query(notifsCol, where('tenantId', '==', cleanTid))
    : notifsCol;

  return onSnapshot(q, (snapshot) => {
    const allNotifs: AppNotification[] = [];
    snapshot.forEach(docSnap => {
      const n = docSnap.data() as AppNotification;
      if (n.userId === userId || n.userId === 'all') {
        allNotifs.push(n);
      }
    });
    allNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(allNotifs.slice(0, 50));
  }, (err) => {
    console.warn('Notifications realtime listener note:', err);
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { read: true });
  } catch (err) {
    console.error('Failed to mark notification read:', err);
  }
}

export async function markAllNotificationsAsRead(notificationIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
      const docRef = doc(db, 'notifications', id);
      batch.update(docRef, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Failed to mark all notifications read:', err);
  }
}

export async function deleteAppNotification(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete notification:', err);
  }
}

export async function deleteMultipleNotifications(notificationIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
      const docRef = doc(db, 'notifications', id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.error('Failed to batch delete notifications:', err);
  }
}



