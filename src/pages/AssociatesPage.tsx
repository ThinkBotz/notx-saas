import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Users,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  fetchAssociates, 
  subscribeToAssociates, 
  createAssociate, 
  deleteAssociate,
  fetchUsers, 
  getTenant 
} from '../firebase';
import { AssociateMember, Tenant, SUPER_ADMIN_EMAILS } from '../types';
import { useTenantContext } from '../context/TenantContext';
import AssociateIdCard from '../components/AssociateIdCard';
import EditAssociateModal from '../components/EditAssociateModal';

// Helper for executive ranking
const getExecutiveRank = (position?: string): number => {
  const pos = (position || '').toLowerCase().trim();
  if (pos === 'president' || (pos.includes('president') && !pos.includes('vice'))) return 1;
  if (pos.includes('vice president') || pos.includes('vp')) return 2;
  if (pos.includes('general secretary') || pos.includes('gen sec')) return 3;
  if (pos.includes('joint secretary')) return 4;
  if (pos.includes('treasurer') || pos.includes('finance')) return 5;
  if (pos.includes('technical head') || pos.includes('technical lead') || pos.includes('tech lead') || pos.includes('developer')) return 6;
  if (pos.includes('event operations') || pos.includes('event lead') || pos.includes('operations')) return 7;
  if (pos.includes('pr') || pos.includes('social media') || pos.includes('public relations')) return 8;
  if (pos.includes('design') || pos.includes('creative')) return 9;
  return 10;
};

export default function AssociatesPage() {
  const { tenantId: routeTenantId } = useParams<{ tenantId?: string }>();
  const navigate = useNavigate();

  // If accessed directly at /associates, default to 'auraml-aitk' or saved active tenant
  const targetTenantId = (routeTenantId || localStorage.getItem('notx_active_tenant') || 'auraml-aitk').toLowerCase().trim();

  const { currentUser } = useTenantContext();

  const [associates, setAssociates] = useState<AssociateMember[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'EXECUTIVES' | 'TECH' | 'OPERATIONS' | 'STUDENTS'>('ALL');
  
  // Modal State for adding or editing cards
  const [editingMember, setEditingMember] = useState<AssociateMember | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Check if current user has administrator or super administrator authority to manage cards
  const isSuperAdminUser = Boolean(
    currentUser && (
      currentUser.isSuperAdmin ||
      (currentUser.email && SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase()))
    )
  );
  const isTenantAdmin = Boolean(
    currentUser &&
    currentUser.role === 'admin' &&
    (!currentUser.tenantId || currentUser.tenantId.toLowerCase() === targetTenantId)
  );
  const canManageCards = isSuperAdminUser || isTenantAdmin;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // 1. Fetch Tenant Metadata
    getTenant(targetTenantId)
      .then(t => {
        if (isMounted && t) setTenant(t);
      })
      .catch(console.warn);

    // 2. Real-time Subscription to Dedicated Associates Registry
    const unsub = subscribeToAssociates(async (list) => {
      if (!isMounted) return;

      // If the dedicated collection is empty, run zero-disruption migration from legacy user directory
      if (list.length === 0) {
        try {
          const legacyUsers = await fetchUsers(targetTenantId);
          const legacyAssociates = (legacyUsers || []).filter(u => {
            if (u.role === 'president' || u.role === 'associate' || u.role === 'coordinator') return true;
            const p = (u.position || '').toLowerCase();
            return p.includes('president') || p.includes('secretary') || p.includes('treasurer') || p.includes('lead') || p.includes('head');
          });

          if (legacyAssociates.length > 0 && isMounted) {
            // Seed each into the dedicated associates collection
            const migrated: AssociateMember[] = [];
            for (const leg of legacyAssociates) {
              const assocObj: AssociateMember = {
                id: `assoc_${(leg.rollNumber || leg.uid).toLowerCase()}`,
                tenantId: targetTenantId,
                name: leg.name || 'Associate',
                rollNumber: leg.rollNumber || '',
                position: leg.position || (leg.role === 'president' ? 'President' : 'Associate Lead'),
                year: leg.year || '3rd Year',
                section: leg.section || 'A',
                responsibilities: leg.responsibilities || '',
                skills: leg.skills || '',
                profile_pic: leg.profile_pic || '',
                linkedin: leg.linkedin || '',
                created_at: new Date().toISOString()
              };
              migrated.push(assocObj);
              // Save asynchronously to Firestore
              createAssociate(assocObj).catch(console.warn);
            }
            setAssociates(migrated);
            setLoading(false);
            return;
          }
        } catch (migErr) {
          console.warn('Associates auto-seed notice:', migErr);
        }
      }

      setAssociates(list);
      setLoading(false);
    }, targetTenantId);

    return () => {
      isMounted = false;
      unsub();
    };
  }, [targetTenantId]);

  // Tenant Display Metadata
  const associationName = tenant?.name || 'AURA ML';
  const departmentName = tenant?.branding?.tagline || 'CSE (Artificial Intelligence & Machine Learning)';
  const collegeCode = (tenant?.shortCode || 'AITK').toUpperCase() + ' 2026';

  // Categorize or filter based on user selection
  const filteredList = useMemo(() => {
    let baseList = [...associates];

    if (activeCategory === 'EXECUTIVES') {
      baseList = baseList.filter(u => {
        const pos = (u.position || '').toLowerCase();
        return pos.includes('president') || pos.includes('secretary') || pos.includes('treasurer') || pos.includes('vice');
      });
    } else if (activeCategory === 'TECH') {
      baseList = baseList.filter(u => {
        const pos = (u.position || '').toLowerCase();
        return pos.includes('tech') || pos.includes('developer') || pos.includes('engineer') || pos.includes('web') || pos.includes('lead');
      });
    } else if (activeCategory === 'OPERATIONS') {
      baseList = baseList.filter(u => {
        const pos = (u.position || '').toLowerCase();
        return pos.includes('operation') || pos.includes('event') || pos.includes('pr') || pos.includes('social') || pos.includes('media') || pos.includes('coordinator');
      });
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      baseList = baseList.filter(u => {
        const matchesName = (u.name || '').toLowerCase().includes(q);
        const matchesRoll = (u.rollNumber || '').toLowerCase().includes(q);
        const matchesPos = (u.position || '').toLowerCase().includes(q);
        const matchesSkills = (u.skills || '').toLowerCase().includes(q);
        return matchesName || matchesRoll || matchesPos || matchesSkills;
      });
    }

    // Sort naturally: Executives first, then rank, then roll number
    return baseList.sort((a, b) => {
      const rankA = getExecutiveRank(a.position);
      const rankB = getExecutiveRank(b.position);
      if (rankA !== rankB) return rankA - rankB;
      return (a.rollNumber || a.name || '').localeCompare(b.rollNumber || b.name || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [associates, activeCategory, searchQuery]);

  const handleDeleteCard = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}'s associate badge?`)) {
      return;
    }
    try {
      await deleteAssociate(id);
      setAssociates(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert('Failed to delete badge: ' + err.message);
    }
  };

  return (
    <div
      className="h-[100dvh] w-full overflow-y-auto scrollbar-none bg-[#F5F0EB] text-[#111111] flex flex-col font-sans selection:bg-amber-300 selection:text-black"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >

      {/* 1. Industrial Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#FFFDF8] border-b-[3px] border-[#111111] px-4 sm:px-8 py-3.5 shadow-[0_3px_0_#111111]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">

          {/* Left: Back / Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(routeTenantId ? `/${routeTenantId}` : '/')}
              className="p-1.5 sm:p-2 rounded bg-amber-400 hover:bg-amber-500 text-neutral-950 border-2 border-[#111111] shadow-[2px_2px_0_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title="Return to Main Portal"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg sm:text-xl tracking-wider uppercase text-neutral-950">
                  {associationName}
                </span>
                <span className="bg-amber-400 text-neutral-950 text-[10px] font-mono font-black px-2 py-0.5 rounded border border-[#111111] shadow-[1px_1px_0_#111111] uppercase tracking-wide">
                  ASSOCIATES
                </span>
              </div>
              <p className="font-mono text-[10px] sm:text-xs text-neutral-600 hidden sm:block">
                {departmentName}
              </p>
            </div>
          </div>

          {/* Right: Add Card (Admin) & Stats */}
          <div className="flex items-center gap-2 sm:gap-3">
            {canManageCards && (
              <button
                onClick={() => {
                  setEditingMember(null);
                  setIsCreatingNew(true);
                }}
                className="inline-flex items-center gap-1.5 font-mono text-xs font-black px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-500 text-neutral-950 border-2 border-[#111111] shadow-[2px_2px_0_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                title="Add New Associate Card"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden xs:inline">ADD ASSOCIATE</span>
              </button>
            )}

            <span className="bg-neutral-950 text-white font-mono text-xs font-bold px-2.5 py-1 rounded border-2 border-[#111111] shadow-[2px_2px_0_#000] shrink-0">
              {filteredList.length} PASSES
            </span>
            <Link
              to={routeTenantId ? `/${routeTenantId}` : '/'}
              className="hidden md:inline-flex items-center gap-1 font-mono text-xs font-black px-3 py-1.5 rounded bg-white hover:bg-neutral-100 text-neutral-950 border-2 border-[#111111] shadow-[2px_2px_0_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <span>MAIN PORTAL</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </header>

      {/* 2. Hero Billboard Banner */}
      <section className="bg-amber-300 border-b-[3px] border-[#111111] px-4 sm:px-8 py-8 sm:py-10 shadow-[0_4px_0_#111111]">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display font-black text-3xl sm:text-5xl text-neutral-950 uppercase tracking-tight leading-none">
            AURA ML ASSOCIATES
          </h1>
          <p className="font-sans font-bold text-sm sm:text-base text-neutral-900 mt-2 max-w-3xl leading-relaxed">
            Hi There 👋 <br />
            This is the official showcase registry of all associates and executive leaders of {associationName}.
          </p>

          {canManageCards && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950 text-amber-400 font-mono text-xs font-black border-2 border-neutral-950 shadow-[2.5px_2.5px_0_#fff]">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>ADMINISTRATIVE BADGE MANAGER • ADD & EDIT CARDS DYNAMICALLY</span>
              </div>
              <button
                onClick={() => {
                  setEditingMember(null);
                  setIsCreatingNew(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-950 font-mono text-xs font-black border-2 border-[#111111] shadow-[2.5px_2.5px_0_#111111] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ADD NEW BADGE</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. Search & Category Filters Bar */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-8 -mt-6 z-20">
        <div
          className="bg-[#FFFDF8] rounded-xl p-3 sm:p-4 border-[3px] border-[#111111] shadow-[5px_5px_0_#111111] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
        >
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Roll Number, Designation, or Skill..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 rounded-lg border-2 border-[#111111] font-mono text-xs sm:text-sm text-neutral-950 placeholder:text-neutral-500 focus:outline-none focus:bg-white focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'ALL ASSOCIATES' },
              { id: 'EXECUTIVES', label: 'EXECUTIVES' },
              { id: 'TECH', label: 'TECH & DEV' },
              { id: 'OPERATIONS', label: 'OPS & PR' },
              { id: 'STUDENTS', label: 'ALL PASSES' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`font-mono text-xs font-black px-3 py-2 rounded-lg border-2 border-[#111111] transition-all whitespace-nowrap cursor-pointer ${activeCategory === tab.id
                  ? 'bg-amber-400 text-neutral-950 shadow-[2px_2px_0_#111111] translate-x-0.5 translate-y-0.5'
                  : 'bg-white hover:bg-neutral-100 text-neutral-800 shadow-[2px_2px_0_#111111]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ID Cards Grid Section */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 flex-1">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center select-none">
            <div className="w-12 h-12 bg-amber-400 border-[2.5px] border-neutral-950 flex items-center justify-center font-display font-black text-sm text-neutral-950 shadow-[3px_3px_0_#000] mb-3">
              NOTX
            </div>
            <Loader2 className="w-6 h-6 text-neutral-950 animate-spin mb-2 stroke-[2.5]" />
            <div className="font-display font-black text-xl text-neutral-950 tracking-wide uppercase">
              NOTX • LOADING BADGES...
            </div>
            <p className="font-mono text-xs text-neutral-600 mt-1">
              Synchronizing verified associate registry for {associationName}
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div
            className="p-8 sm:p-12 rounded-xl bg-white border-[3px] border-[#111111] shadow-[5px_5px_0_#111111] text-center max-w-lg mx-auto"
          >
            <div className="w-12 h-12 rounded-full bg-amber-200 border-2 border-[#111111] mx-auto flex items-center justify-center font-black mb-3">
              <Users className="w-6 h-6 text-neutral-950" />
            </div>
            <h3 className="font-display font-black text-xl text-neutral-950 uppercase">
              NO ASSOCIATE ID CARDS FOUND
            </h3>
            <p className="font-mono text-xs text-neutral-600 mt-1">
              {searchQuery ? `No badges matched "${searchQuery}". Try a different name or designation.` : 'No associate badges registered under this group yet.'}
            </p>
            {canManageCards && (
              <button
                onClick={() => {
                  setEditingMember(null);
                  setIsCreatingNew(true);
                }}
                className="mt-4 font-mono text-xs font-black px-4 py-2 rounded bg-amber-400 text-neutral-950 border-2 border-[#111111] shadow-[2px_2px_0_#111111] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>CREATE FIRST ASSOCIATE BADGE</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {filteredList.map((member) => (
              <AssociateIdCard
                key={member.id || member.rollNumber}
                member={member}
                tenantName={associationName}
                departmentName={departmentName}
                collegeCode={collegeCode}
                canEdit={canManageCards}
                onEdit={() => {
                  setEditingMember(member);
                  setIsCreatingNew(false);
                }}
                onDelete={() => handleDeleteCard(member.id, member.name)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dynamic Add / Edit Modal */}
      {(editingMember || isCreatingNew) && (
        <EditAssociateModal
          member={editingMember}
          tenantName={associationName}
          tenantId={targetTenantId}
          onClose={() => {
            setEditingMember(null);
            setIsCreatingNew(false);
          }}
          onSaved={(saved) => {
            setAssociates(prev => {
              const exists = prev.some(a => a.id === saved.id);
              if (exists) return prev.map(a => a.id === saved.id ? saved : a);
              return [saved, ...prev];
            });
            setEditingMember(null);
            setIsCreatingNew(false);
          }}
          onDeleted={(id) => {
            setAssociates(prev => prev.filter(a => a.id !== id));
            setEditingMember(null);
            setIsCreatingNew(false);
          }}
        />
      )}

      {/* 5. Neo-Brutalist Footer */}
      <footer className="border-t-[3px] border-[#111111] bg-[#FFFDF8] px-4 sm:px-8 py-6 text-center shadow-[0_-3px_0_#111111]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-sm uppercase text-neutral-950">
              {associationName} • NOTX CONNECT
            </span>
            <span className="font-mono text-xs text-neutral-500">
              [ VERIFIED REGISTRY ]
            </span>
          </div>
          <div className="font-mono text-xs text-neutral-600">
            Engineered for Annamacharya Institute of Technology and Sciences (AITK)
          </div>
        </div>
      </footer>

    </div>
  );
}
