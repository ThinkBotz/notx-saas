import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Filter,
  Users,
  Award,
  Loader2
} from 'lucide-react';
import { fetchUsers, getTenant } from '../firebase';
import { UserProfile, Tenant } from '../types';
import AssociateIdCard from '../components/AssociateIdCard';

// Helper for executive ranking
const getExecutiveRank = (position?: string, role?: string): number => {
  if (role === 'president') return 1;
  const pos = (position || '').toLowerCase().trim();
  if (pos === 'president') return 1;
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

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'EXECUTIVES' | 'TECH' | 'OPERATIONS' | 'STUDENTS'>('ALL');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [fetchedUsers, fetchedTenant] = await Promise.all([
          fetchUsers(targetTenantId),
          getTenant(targetTenantId)
        ]);

        if (isMounted) {
          setUsers(fetchedUsers || []);
          if (fetchedTenant) {
            setTenant(fetchedTenant);
          }
        }
      } catch (err) {
        console.error('Failed to load associates data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [targetTenantId]);

  // Tenant Display Metadata
  const associationName = tenant?.name || 'AURA ML';
  const departmentName = tenant?.branding?.tagline || 'CSE (Artificial Intelligence & Machine Learning)';
  const collegeCode = (tenant?.shortCode || 'AITK').toUpperCase() + ' 2026';

  // Filter out system admins / master admin
  const validUsers = useMemo(() => {
    return users.filter(u => !u.isSuperAdmin && u.uid !== 'admin_master');
  }, [users]);

  // Extract core associates & executives
  const associateMembers = useMemo(() => {
    return validUsers.filter(u => {
      // 1. Explicit role match
      if (u.role === 'president' || u.role === 'associate' || u.role === 'coordinator') return true;

      // 2. Position match (President, VP, Secretary, Treasurer, Lead, Head, Coordinator)
      const pos = (u.position || '').toLowerCase();
      if (
        pos.includes('president') ||
        pos.includes('secretary') ||
        pos.includes('treasurer') ||
        pos.includes('head') ||
        pos.includes('lead') ||
        pos.includes('director') ||
        pos.includes('coordinator') ||
        pos.includes('convenor') ||
        pos.includes('manager') ||
        pos.includes('strategist') ||
        pos.includes('engineer') ||
        pos.includes('designer') ||
        pos.includes('developer') ||
        pos.includes('associate')
      ) {
        return true;
      }

      return false;
    });
  }, [validUsers]);

  // Categorize or filter based on user selection
  const filteredList = useMemo(() => {
    let baseList = activeCategory === 'STUDENTS' ? validUsers : associateMembers;

    // If activeCategory is specific
    if (activeCategory === 'EXECUTIVES') {
      baseList = baseList.filter(u => {
        if (u.role === 'president') return true;
        const pos = (u.position || '').toLowerCase();
        return pos.includes('president') || pos.includes('secretary') || pos.includes('treasurer');
      });
    } else if (activeCategory === 'TECH') {
      baseList = baseList.filter(u => {
        const pos = (u.position || '').toLowerCase();
        return pos.includes('tech') || pos.includes('developer') || pos.includes('engineer') || pos.includes('web');
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
    return [...baseList].sort((a, b) => {
      const rankA = getExecutiveRank(a.position, a.role);
      const rankB = getExecutiveRank(b.position, b.role);
      if (rankA !== rankB) return rankA - rankB;
      return (a.rollNumber || a.name || '').localeCompare(b.rollNumber || b.name || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [associateMembers, validUsers, activeCategory, searchQuery]);

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

          {/* Right: Badge stats & Portal link */}
          <div className="flex items-center gap-2 sm:gap-3">
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
            This is the list of all the associates of the AURA ML association.
          </p>
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
              { id: 'STUDENTS', label: 'ALL STUDENTS' }
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
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3 stroke-[2.5]" />
            <div className="font-display font-black text-xl text-neutral-950 tracking-wide uppercase">
              GENERATING CRYPTOGRAPHIC ID BADGES...
            </div>
            <p className="font-mono text-xs text-neutral-600 mt-1">
              Synchronizing associate registry from {associationName} datastore
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
              {searchQuery ? `No badges matched "${searchQuery}". Try a different name or roll number.` : 'No members registered under this category yet.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 font-mono text-xs font-black px-4 py-2 rounded bg-amber-400 text-neutral-950 border-2 border-[#111111] shadow-[2px_2px_0_#111111] active:translate-x-0.5 active:translate-y-0.5"
              >
                CLEAR SEARCH FILTER
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {filteredList.map((member) => (
              <AssociateIdCard
                key={member.uid || member.rollNumber}
                member={member}
                tenantName={associationName}
                collegeCode={collegeCode}
              />
            ))}
          </div>
        )}
      </main>

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
