import { initializeApp, getApps as getSecondaryApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as signOutSecondary } from 'firebase/auth';
import { getDatabase, ref, get, set, push, remove, update, onValue } from 'firebase/database';
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
  onSnapshot
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
  TeamMember,
  UserInvitation,
  ChatRoom,
  AppConfig,
  SupportInfo,
  DEFAULT_SUPPORT_INFO,
  CertificateTemplate,
  DEFAULT_CERTIFICATE_TEMPLATE,
  IssuedCertificate,
  EventWinner,
  AppBranding,
  DEFAULT_BRANDING
} from './types';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const auth = getAuth(app);
export const rtdb = getDatabase(app, (firebaseConfig as any).databaseURL);

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

export async function createTenant(tenant: Tenant): Promise<void> {
  const cleanId = tenant.tenantId.trim().toLowerCase();
  const path = `tenants/${cleanId}`;
  try {
    const finalTenant: Tenant = {
      ...tenant,
      tenantId: cleanId,
      adminEmail: tenant.adminEmail.trim().toLowerCase(),
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
      email: finalTenant.adminEmail,
      googleEmail: finalTenant.adminEmail,
      role: 'admin',
      tenantId: cleanId,
      position: 'Department Admin',
      department: tenant.name,
      responsibilities: `Administrative control for ${tenant.name}`,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', adminUid), cleanUndefined(adminUser));

    // Initialize tenant-scoped app configuration with initial branding & settings
    const configDocId = `config_${cleanId}`;
    const initialConfig: AppConfig = {
      isChatEnabled: true,
      isCertificatesEnabled: true,
      certificateTemplate: DEFAULT_CERTIFICATE_TEMPLATE,
      supportInfo: finalTenant.supportInfo || DEFAULT_SUPPORT_INFO,
      branding: finalTenant.branding || DEFAULT_BRANDING,
      tenantId: cleanId
    };
    await setDoc(doc(db, 'appSettings', configDocId), cleanUndefined(initialConfig));
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
  } catch (err) {
    console.error('[Ownership Transfer Error]:', err);
    throw err;
  }
}

export async function updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void> {
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
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
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


// Seeding engine - Template auto-seeding disabled to ensure multi-tenant blank state
export async function seedDatabaseIfEmpty() {
  try {
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

// ---------------- DATABASE ACTIONS ----------------

// Users
export async function fetchUsers(tenantId?: string): Promise<UserProfile[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users: UserProfile[] = [];
    const cleanTid = tenantId ? tenantId.trim().toLowerCase() : '';
    querySnapshot.forEach((doc) => {
      const u = doc.data() as UserProfile;
      if (cleanTid) {
        if (u.tenantId && u.tenantId.trim().toLowerCase() === cleanTid) {
          users.push(u);
        }
      } else {
        users.push(u);
      }
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
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

export async function deleteUserProfile(uid: string) {
  try {
    const docRef = doc(db, "users", uid);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting user profile: ", error);
    throw error;
  }
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

// Events
export async function fetchEvents(tenantId?: string): Promise<DepartmentEvent[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'events'));
    const events: DepartmentEvent[] = [];
    querySnapshot.forEach((doc) => {
      const ev = doc.data() as DepartmentEvent;
      if (!tenantId || ev.tenantId === tenantId) {
        events.push(ev);
      }
    });
    // Sort by date ascending
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'events');
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
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Registrations
export async function fetchRegistrations(tenantId?: string): Promise<EventRegistration[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'registrations'));
    const registrations: EventRegistration[] = [];
    querySnapshot.forEach((doc) => {
      const reg = doc.data() as EventRegistration;
      if (!tenantId || reg.tenantId === tenantId) {
        registrations.push(reg);
      }
    });
    return registrations;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'registrations');
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
  }
}

export async function createRegistration(reg: EventRegistration): Promise<void> {
  const path = `registrations/${reg.registrationId}`;
  try {
    const docRef = doc(db, 'registrations', reg.registrationId);
    const finalReg = {
      ...reg,
      tenantId: reg.tenantId || getActiveTenantId()
    };
    await setDoc(docRef, cleanUndefined(finalReg));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
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
    return onSnapshot(collection(db, 'registrations'), (snapshot) => {
      const registrations: EventRegistration[] = [];
      snapshot.forEach((d) => {
        const r = d.data() as EventRegistration;
        // Tenant-scoped: only include registrations belonging to this tenant
        if (!filterTid || (r.tenantId && r.tenantId.trim().toLowerCase() === filterTid)) {
          if (!eventId || r.eventId === eventId) {
            registrations.push(r);
          }
        }
      });
      // Sort newest registration first
      registrations.sort((a, b) => new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime());
      callback(registrations);
    }, (error) => {
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
    }
    await updateDoc(docRef, updateData);
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

export async function deleteRegistration(registrationId: string): Promise<void> {
  const path = `registrations/${registrationId}`;
  try {
    const docRef = doc(db, 'registrations', registrationId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Gallery
export async function fetchAlbums(tenantId?: string): Promise<Album[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'albums'));
    const items: Album[] = [];
    querySnapshot.forEach((doc) => {
      const alb = doc.data() as Album;
      if (!tenantId || alb.tenantId === tenantId) {
        items.push(alb);
      }
    });
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'albums');
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
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAlbum(albumId: string, updates: Partial<Album>): Promise<void> {
  const path = `albums/${albumId}`;
  try {
    const docRef = doc(db, 'albums', albumId);
    await updateDoc(docRef, cleanUndefined(updates) as any);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAlbum(albumId: string): Promise<void> {
  const path = `albums/${albumId}`;
  try {
    const docRef = doc(db, 'albums', albumId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Announcements
export async function fetchAnnouncements(tenantId?: string): Promise<Announcement[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'announcements'));
    const items: Announcement[] = [];
    querySnapshot.forEach((doc) => {
      const ann = doc.data() as Announcement;
      if (!tenantId || ann.tenantId === tenantId) {
        items.push(ann);
      }
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'announcements');
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
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
// User Invitations & Direct Messaging
export async function fetchReceivedInvitations(rollNumber: string, tenantId?: string): Promise<UserInvitation[]> {
  try {
    const cleanTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
    const q = query(collection(db, 'invitations'), where('recipientRoll', '==', rollNumber.trim().toUpperCase()));
    const querySnapshot = await getDocs(q);
    const list: UserInvitation[] = [];
    querySnapshot.forEach((doc) => {
      const inv = doc.data() as UserInvitation;
      // Tenant-scope: include only invitations that match this tenant (or have no tenant for legacy)
      if (!cleanTid || !inv.tenantId || inv.tenantId === cleanTid) {
        list.push(inv);
      }
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'invitations');
    return [];
  }
}

export async function fetchSentInvitations(uid: string, rollNumber?: string, tenantId?: string): Promise<UserInvitation[]> {
  try {
    const cleanTid = (tenantId || getActiveTenantId()).trim().toLowerCase();
    let q;
    if (rollNumber) {
      q = query(collection(db, 'invitations'), where('senderRoll', '==', rollNumber.trim().toUpperCase()));
    } else {
      q = query(collection(db, 'invitations'), where('senderUid', '==', uid));
    }
    const querySnapshot = await getDocs(q);
    const list: UserInvitation[] = [];
    querySnapshot.forEach((doc) => {
      const inv = doc.data() as UserInvitation;
      if (!cleanTid || !inv.tenantId || inv.tenantId === cleanTid) {
        list.push(inv);
      }
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'invitations');
    return [];
  }
}

export async function createInvitation(invite: UserInvitation): Promise<void> {
  const path = `invitations/${invite.invitationId}`;
  try {
    const docRef = doc(db, 'invitations', invite.invitationId);
    const finalInvite = {
      ...invite,
      tenantId: invite.tenantId || getActiveTenantId()
    };
    await setDoc(docRef, cleanUndefined(finalInvite));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInvitationStatus(inviteId: string, status: 'Pending' | 'Accepted' | 'Declined'): Promise<void> {
  const path = `invitations/${inviteId}`;
  try {
    const docRef = doc(db, 'invitations', inviteId);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Deletions
export async function updateEvent(event: DepartmentEvent): Promise<void> {
  const path = `events/${event.eventId}`;
  try {
    const docRef = doc(db, 'events', event.eventId);
    await setDoc(docRef, cleanUndefined(event), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  const path = `events/${eventId}`;
  try {
    const docRef = doc(db, 'events', eventId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const path = `announcements/${announcementId}`;
  try {
    const docRef = doc(db, 'announcements', announcementId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------- UNIFIED CHATS COLLECTION (REALTIME DATABASE RTDB MODEL) ----------------

export function getChatRoomId(rollA: string, rollB: string, tenantId?: string): string {
  const rA = rollA.trim().toUpperCase();
  const rB = rollB.trim().toUpperCase();
  // Sort alphabetically to ensure same ID is generated for both (A->B and B->A)
  const sorted = [rA, rB].sort();
  const base = `CHAT_${sorted[0]}_${sorted[1]}`;
  // Prefix with tenantId so each association's chats are isolated in RTDB
  return tenantId ? `${tenantId.trim().toLowerCase()}/${base}` : base;
}

export async function sendChatMessage(
  sender: UserProfile,
  recipientRoll: string,
  recipientUid: string,
  recipientName: string,
  messageText: string,
  type: 'chat' | 'invite' = 'chat'
): Promise<void> {
  if (!sender.rollNumber) throw new Error("Sender has no roll number");
  
  const rRoll = recipientRoll.trim().toUpperCase();
  const sRoll = sender.rollNumber.trim().toUpperCase();
  const chatId = getChatRoomId(sRoll, rRoll, sender.tenantId || getActiveTenantId());
  
  try {
    const chatRef = ref(rtdb, `chats/${chatId}`);
    const snapshot = await get(chatRef);
    let isNewChat = true;
    
    if (snapshot.exists()) {
      const val = snapshot.val();
      if (val.messages && Object.keys(val.messages).length > 0) {
        isNewChat = false;
      }
    }

    const actualType = isNewChat ? 'invite' : type;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const newInvite: UserInvitation = {
      invitationId: msgId,
      senderUid: sender.uid,
      senderName: sender.name,
      senderRoll: sRoll,
      recipientUid,
      recipientRoll: rRoll,
      recipientName,
      message: messageText.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      type: actualType,
      isRead: false
    };

    const updates: Record<string, any> = {};
    updates[`chats/${chatId}/participants`] = [sRoll, rRoll];
    updates[`chats/${chatId}/chatId`] = chatId;
    updates[`chats/${chatId}/lastMessageAt`] = newInvite.createdAt;
    updates[`chats/${chatId}/messages/${msgId}`] = cleanUndefined(newInvite);

    await update(ref(rtdb), updates);
  } catch (error) {
    console.error("Error sending chat message via RTDB:", error);
    throw error;
  }
}

export async function markMessagesAsRead(
  userRoll: string,
  classmateRoll: string,
  tenantId?: string
): Promise<void> {
  const chatId = getChatRoomId(userRoll, classmateRoll, tenantId);
  const userRollUpper = userRoll.trim().toUpperCase();
  
  try {
    const msgsRef = ref(rtdb, `chats/${chatId}/messages`);
    const snapshot = await get(msgsRef);
    if (!snapshot.exists()) return;

    const msgs = snapshot.val() || {};
    const updates: Record<string, any> = {};

    Object.entries(msgs).forEach(([msgId, msg]: [string, any]) => {
      if (msg.recipientRoll?.toUpperCase() === userRollUpper && msg.type === 'chat' && !msg.isRead) {
        updates[`chats/${chatId}/messages/${msgId}/isRead`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(rtdb), updates);
    }
  } catch (error) {
    console.error("Error marking messages as read via RTDB:", error);
  }
}

export async function respondToChatInvite(
  chatId: string,
  messageId: string,
  status: 'Accepted' | 'Declined'
): Promise<void> {
  try {
    const msgRef = ref(rtdb, `chats/${chatId}/messages/${messageId}/status`);
    await set(msgRef, status);
  } catch (error) {
    console.error("Error responding to chat invite via RTDB:", error);
  }
}

export async function deleteChatRoom(chatId: string): Promise<void> {
  try {
    await remove(ref(rtdb, `chats/${chatId}`));
  } catch (error) {
    console.error("Error deleting chat room via RTDB:", error);
  }
}

export async function deleteChatMessage(
  chatId: string,
  messageId: string
): Promise<void> {
  try {
    await remove(ref(rtdb, `chats/${chatId}/messages/${messageId}`));
  } catch (error) {
    console.error("Error deleting chat message via RTDB:", error);
  }
}

export async function updateTypingStatus(
  chatId: string,
  rollNumber: string,
  isTyping: boolean
): Promise<void> {
  const cleanRoll = rollNumber.trim().toUpperCase();
  try {
    const typingRef = ref(rtdb, `chats/${chatId}/typing/${cleanRoll}`);
    if (isTyping) {
      await set(typingRef, true);
    } else {
      await remove(typingRef);
    }
  } catch (error) {
    console.error('Error updating typing status via RTDB:', error);
  }
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
        isChatEnabled: true,
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
      isChatEnabled: true, 
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

export async function updateAppConfig(isChatEnabled: boolean, tenantId?: string): Promise<void> {
  const docId = getConfigDocId(tenantId);
  try {
    const configDocRef = doc(db, 'appSettings', docId);
    await setDoc(configDocRef, { isChatEnabled }, { merge: true });
  } catch (error) {
    console.error('Error updating app config:', error);
  }
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
        isChatEnabled: true,
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
    invitations: any[];
    chats: any[];
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
    'invitations',
    'chats',
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
      invitations: [],
      chats: [],
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

  // Step 1: Delete only docs that belong to this tenant
  const collectionsToWipe = [
    'events',
    'registrations',
    'certificates',
    'event_winners',
    'announcements',
    'albums',
    'gallery',
    'notifications',
    'invitations',
    'chats'
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
    localStorage.removeItem('chat_drafts');
    localStorage.removeItem('qr_scan_recent');
  } catch (e) {
    // ignore
  }

  onProgress?.('Association reset complete!', 100);
  return summary;
}

export const clearAllDatabaseData = async () => {
  const collections = ['users', 'events', 'registrations', 'albums', 'announcements', 'invitations', 'chats', 'certificates', 'event_winners', 'gallery', 'notifications'];
  
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
    const querySnapshot = await getDocs(collection(db, 'certificates'));
    const certs: IssuedCertificate[] = [];
    const filterTid = (tenantId || '').trim().toLowerCase();
    querySnapshot.forEach(docSnap => {
      const cert = docSnap.data() as IssuedCertificate;
      if (!filterTid || cert.tenantId === filterTid) {
        certs.push(cert);
      }
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
  return onSnapshot(
    collection(db, 'certificates'),
    (snapshot) => {
      const certs: IssuedCertificate[] = [];
      snapshot.forEach(docSnap => {
        const cert = docSnap.data() as IssuedCertificate;
        // Tenant-scoped: only include certs belonging to this tenant
        if (!filterTid || cert.tenantId === filterTid) {
          certs.push(cert);
        }
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

export async function deleteCertificate(certificateId: string): Promise<void> {
  const path = `certificates/${certificateId}`;
  try {
    await deleteDoc(doc(db, 'certificates', certificateId));
  } catch (error) {
    console.error('Error deleting certificate:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
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

export async function fetchEventWinners(): Promise<EventWinner[]> {
  const path = 'event_winners';
  try {
    const snap = await getDocs(collection(db, 'event_winners'));
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
    return onSnapshot(collection(db, 'event_winners'), (snapshot) => {
      const winners: EventWinner[] = [];
      snapshot.forEach((d) => {
        const w = d.data() as EventWinner;
        // Tenant-scoped: only include winners belonging to this tenant
        if (!filterTid || w.tenantId === filterTid) {
          winners.push(w);
        }
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
  } catch (error) {
    console.error('Error updating event winner:', error);
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteEventWinner(winnerId: string): Promise<void> {
  const path = `event_winners/${winnerId}`;
  try {
    await deleteDoc(doc(db, 'event_winners', winnerId));
  } catch (error) {
    console.error('Error deleting event winner:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}



