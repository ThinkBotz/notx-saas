import React, { useState } from 'react';
import { Linkedin, Copy, Check, Edit3 } from 'lucide-react';
import { UserProfile } from '../types';

interface AssociateIdCardProps {
  member: UserProfile;
  tenantName?: string;
  departmentName?: string;
  collegeCode?: string;
  yearBatch?: string;
  canEdit?: boolean;
  onEdit?: () => void;
}

// Helper to determine role badge styling in neo-brutalism
const getBadgeStyle = (position?: string, role?: string): string => {
  const pos = (position || '').toLowerCase();
  const r = (role || '').toLowerCase();

  if (r === 'president' || (pos.includes('president') && !pos.includes('vice'))) {
    return 'bg-amber-400 text-neutral-950 font-black';
  }
  if (pos.includes('vice president') || pos.includes('vp')) {
    return 'bg-yellow-300 text-neutral-950 font-black';
  }
  if (pos.includes('general secretary') || pos.includes('secretary')) {
    return 'bg-emerald-400 text-neutral-950 font-black';
  }
  if (pos.includes('treasurer')) {
    return 'bg-teal-300 text-neutral-950 font-black';
  }
  if (pos.includes('technical') || pos.includes('tech') || pos.includes('developer')) {
    return 'bg-sky-400 text-neutral-950 font-black';
  }
  if (pos.includes('event') || pos.includes('operations')) {
    return 'bg-indigo-300 text-neutral-950 font-black';
  }
  if (pos.includes('pr') || pos.includes('social') || pos.includes('media')) {
    return 'bg-pink-400 text-neutral-950 font-black';
  }
  if (pos.includes('design') || pos.includes('creative')) {
    return 'bg-purple-300 text-neutral-950 font-black';
  }
  return 'bg-amber-300 text-neutral-950 font-black';
};

export default function AssociateIdCard({
  member,
  tenantName = 'AURA ML',
  departmentName,
  collegeCode = 'AITK 2026',
  canEdit = false,
  onEdit
}: AssociateIdCardProps) {
  const [copied, setCopied] = useState(false);

  const cleanName = member.name
    ? member.name.replace(/\s*\([A-Za-z0-9]+\)\s*$/, '').trim()
    : (member.rollNumber || 'ASSOCIATE');

  const avatarUrl = member.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`;
  const fallbackAvatar = `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`;

  const badgeStyle = getBadgeStyle(member.position, member.role);

  // Dynamic department / branch label
  const departmentLabel = member.department || member.branch || departmentName || 'CSE (AI & ML)';

  // Status computation
  const isExecutive =
    member.role === 'president' ||
    (member.position && (
      member.position.toLowerCase().includes('president') ||
      member.position.toLowerCase().includes('secretary') ||
      member.position.toLowerCase().includes('treasurer')
    ));

  const statusText = isExecutive ? 'CORE EXECUTIVE' : 'ASSOCIATE LEAD';

  // Format Year & Section
  const formatYearSec = () => {
    const parts: string[] = [];
    if (member.year) {
      parts.push(member.year.toUpperCase());
    } else {
      parts.push(departmentLabel.toUpperCase());
    }
    if (member.section) {
      parts.push(`SEC ${member.section.toUpperCase()}`);
    }
    return parts.join(' • ');
  };

  // Responsibilities or Skills fallback
  const cleanResponsibilities = member.responsibilities
    ? member.responsibilities.replace(/\s+\./g, '.').trim()
    : (member.skills ? `Focus Areas & Skills: ${member.skills}` : 'Active departmental member driving student association initiatives, technical workshops, and campus community development.');

  // Monospace serial code
  const roll = member.rollNumber ? member.rollNumber.toUpperCase().trim() : member.uid.substring(0, 8).toUpperCase();
  const serialId = `AITK-AIML-${roll}`;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/associates#${roll.toLowerCase()}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      id={roll.toLowerCase()}
      className="group relative bg-[#FFFDF8] rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_#000]"
      style={{
        border: '3px solid #111111',
        boxShadow: '5px 5px 0 #111111'
      }}
    >
      {/* 1. Lanyard Clip Punch Hole */}
      <div className="flex justify-center -mt-1 mb-2.5">
        <div className="w-16 h-3.5 bg-neutral-900 rounded-full border-2 border-neutral-700 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] flex items-center justify-center">
          <div className="w-8 h-1 bg-neutral-700/80 rounded-full"></div>
        </div>
      </div>

      {/* 2. Top Header Bar */}
      <div className="flex items-center justify-between border-b-2 border-neutral-950 pb-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-3.5 h-3.5 bg-amber-400 border-2 border-neutral-950 shrink-0 shadow-[1px_1px_0_#000]"></div>
          <span className="font-display font-black text-xs sm:text-sm tracking-wider uppercase text-neutral-950 truncate">
            {tenantName}
          </span>
          <span className="text-[11px] font-mono text-neutral-600 shrink-0 hidden xs:inline">
            • {departmentLabel}
          </span>
        </div>
        <div className="shrink-0 bg-neutral-950 text-white font-mono text-[10px] sm:text-xs font-black px-2 py-0.5 rounded border border-neutral-950 shadow-[1.5px_1.5px_0_#000]">
          [ {collegeCode} ]
        </div>
      </div>

      {/* Double Separator Line */}
      <div className="h-0.5 bg-neutral-950 mb-3.5"></div>

      {/* 3. Photo & Details Block */}
      <div className="flex items-start gap-3.5 sm:gap-4 mb-3">
        {/* Photo Avatar */}
        <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-md bg-neutral-200 border-[2.5px] border-neutral-950 shrink-0 overflow-hidden shadow-[2px_2px_0_#000] relative group-hover:border-amber-500 transition-colors">
          <img
            src={avatarUrl}
            alt={cleanName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackAvatar;
            }}
          />
          <div className="absolute bottom-0 inset-x-0 bg-neutral-950/85 text-[8px] font-mono text-white text-center py-0.5 uppercase tracking-wider font-bold">
            VERIFIED
          </div>
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
          <div>
            <h4 className="font-display font-black text-base sm:text-lg text-neutral-950 uppercase tracking-tight truncate leading-tight">
              {cleanName}
            </h4>

            {/* Role Badge */}
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 font-mono text-[10px] sm:text-xs font-black px-2 py-0.5 rounded border border-neutral-950 shadow-[1.5px_1.5px_0_#000] uppercase ${badgeStyle}`}>
                ★ {member.position || member.role?.toUpperCase() || 'ASSOCIATE'}
              </span>
            </div>
          </div>

          {/* Roll, Year, Status */}
          <div className="space-y-0.5 font-mono text-[11px] sm:text-xs text-neutral-900 mt-2">
            <div className="flex items-center gap-1">
              <span className="text-neutral-500 font-bold shrink-0">ROLL NO:</span>
              <span className="font-black tracking-wide text-neutral-950 bg-neutral-100 px-1 rounded border border-neutral-300">
                {member.rollNumber || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <span className="text-neutral-500 font-bold shrink-0">YEAR:</span>
              <span className="font-bold text-neutral-800 truncate">
                {formatYearSec()}
              </span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <span className="text-neutral-500 font-bold shrink-0">STATUS:</span>
              <span className="font-black text-amber-700 uppercase tracking-wide truncate">
                {statusText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Responsibilities Section */}
      <div className="border-t-2 border-dashed border-neutral-300 pt-2.5 mb-3 flex-1">
        <div className="font-mono text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-1">
          RESPONSIBILITIES:
        </div>
        <p className="font-sans text-xs text-neutral-800 leading-relaxed line-clamp-3">
          {cleanResponsibilities}
        </p>
      </div>

      {/* 5. Barcode & Action Buttons Footer */}
      <div className="border-t-2 border-neutral-950 pt-2.5 flex items-center justify-between gap-2 flex-wrap">
        {/* Monospace Barcode & Serial
        <div className="flex flex-col">
          <div className="flex items-center gap-0.5 text-neutral-900 select-none">
            <span className="font-mono font-black text-[10px] tracking-tight">|||</span>
            <span className="font-mono text-[10px] tracking-tighter">|</span>
            <span className="font-mono font-black text-[10px] tracking-tight">||||</span>
            <span className="font-mono text-[10px] tracking-tighter">|</span>
            <span className="font-mono font-black text-[10px] tracking-tight">|||</span>
            <span className="font-mono text-[10px] tracking-tighter">|</span>
            <span className="font-mono font-black text-[10px] tracking-tight">||||</span>
          </div>
          <span className="font-mono font-extrabold text-[9.5px] text-neutral-600 tracking-wider">
            *{serialId}*
          </span>
        </div> */}

        {/* Contact & Share Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1 font-mono text-[10px] sm:text-[11px] font-black px-2 py-1 rounded bg-amber-400 hover:bg-amber-500 text-neutral-950 border border-neutral-950 shadow-[1.5px_1.5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title={`Edit ${cleanName}'s ID Badge`}
            >
              <Edit3 className="w-3 h-3" />
              <span>EDIT</span>
            </button>
          )}
          {member.linkedin && (
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[10px] sm:text-[11px] font-black px-2 py-1 rounded bg-[#0A66C2] hover:bg-[#084e96] text-white border border-neutral-950 shadow-[1.5px_1.5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title="LinkedIn Profile"
            >
              <Linkedin className="w-3 h-3" />
              <span>LINKEDIN</span>
            </a>
          )}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 font-mono text-[10px] sm:text-[11px] font-black px-2 py-1 rounded bg-white hover:bg-neutral-100 text-neutral-950 border border-neutral-950 shadow-[1.5px_1.5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            title="Copy Direct Link to ID Card"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'COPIED' : 'SHARE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
