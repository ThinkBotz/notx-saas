import React, { useState } from 'react';
import { 
  X, Save, Upload, RefreshCw, AlertCircle, 
  Trash2, UserPlus, Sparkles 
} from 'lucide-react';
import { AssociateMember } from '../types';
import { uploadToCloudinary } from '../cloudinary';
import { createAssociate, updateAssociate, deleteAssociate } from '../firebase';

interface EditAssociateModalProps {
  member?: AssociateMember | null;
  tenantName: string;
  tenantId: string;
  onClose: () => void;
  onSaved: (savedAssociate: AssociateMember) => void;
  onDeleted?: (id: string) => void;
}

export default function EditAssociateModal({
  member,
  tenantName,
  tenantId,
  onClose,
  onSaved,
  onDeleted
}: EditAssociateModalProps) {
  const isEditing = Boolean(member && member.id);

  const [name, setName] = useState(member?.name || '');
  const [rollNumber, setRollNumber] = useState(member?.rollNumber || '');
  const [position, setPosition] = useState(member?.position || '');
  const [category, setCategory] = useState<'ALL' | 'EXECUTIVES' | 'TECH' | 'OPERATIONS' | 'STUDENTS'>(
    member?.category || 'EXECUTIVES'
  );
  const [year, setYear] = useState(member?.year || '3rd Year');
  const [section, setSection] = useState(member?.section || 'A');
  const [responsibilities, setResponsibilities] = useState(member?.responsibilities || '');
  const [skills, setSkills] = useState(member?.skills || '');
  const [linkedin, setLinkedin] = useState(member?.linkedin || '');
  const [profilePic, setProfilePic] = useState(member?.profile_pic || '');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const url = await uploadToCloudinary(file);
      setProfilePic(url);
    } catch (err: any) {
      console.error('Cloudinary photo upload failed:', err);
      setError(err.message || 'Failed to upload photo to Cloudinary.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Member name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const cleanRoll = rollNumber.trim().toUpperCase();
      const cleanTenant = tenantId.trim().toLowerCase();
      const targetId = member?.id || `assoc_${cleanRoll.toLowerCase() || Date.now()}`;

      const associatePayload: AssociateMember = {
        id: targetId,
        tenantId: cleanTenant,
        name: name.trim(),
        rollNumber: cleanRoll,
        position: position.trim() || 'Associate Member',
        category: category,
        year: year,
        section: section.trim().toUpperCase(),
        responsibilities: responsibilities.trim(),
        skills: skills.trim(),
        linkedin: linkedin.trim(),
        profile_pic: profilePic.trim(),
        created_at: member?.created_at || new Date().toISOString()
      };

      if (isEditing) {
        await updateAssociate(targetId, associatePayload);
      } else {
        await createAssociate(associatePayload);
      }

      onSaved(associatePayload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save associate card to Firestore:', err);
      setError(err.message || 'Failed to save card. Please check permissions.');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!member?.id) return;
    if (!window.confirm(`Are you sure you want to delete the badge for ${member.name}? This will remove it from the associates showcase.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAssociate(member.id);
      if (onDeleted) onDeleted(member.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete associate badge:', err);
      setError(err.message || 'Failed to delete badge.');
      setIsDeleting(false);
    }
  };

  const previewAvatar = profilePic || `https://api.dicebear.com/9.x/notionists/svg?seed=${rollNumber || member?.id || 'assoc'}`;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-[#FFFDF8] rounded-xl border-[3.5px] border-[#111111] shadow-[8px_8px_0_#111111] flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-amber-400 border-b-[3px] border-[#111111] px-5 py-3.5 flex items-center justify-between gap-3 select-none flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-neutral-950 text-amber-400 border-2 border-neutral-950 shadow-[1.5px_1.5px_0_#000] flex items-center justify-center font-black">
              ★
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-black text-base sm:text-lg text-neutral-950 uppercase tracking-tight truncate">
                {isEditing ? 'EDIT ASSOCIATE ID BADGE' : 'ADD NEW ASSOCIATE ID BADGE'}
              </h3>
              <p className="font-mono text-[10px] text-neutral-900 font-bold truncate">
                Public Showcase Registry • {tenantName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-white hover:bg-neutral-100 text-neutral-950 border-2 border-neutral-950 shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            title="Cancel & Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans text-neutral-950">
          {error && (
            <div className="p-3 rounded-lg bg-rose-100 border-2 border-rose-950 text-rose-900 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Photo & Cloudinary Uploader */}
          <div className="p-3.5 bg-neutral-100 rounded-lg border-2 border-neutral-950 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-20 h-24 rounded-md bg-neutral-200 border-2 border-neutral-950 shrink-0 overflow-hidden shadow-[2px_2px_0_#000] relative">
              <img 
                src={previewAvatar} 
                alt="Preview" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute bottom-0 inset-x-0 bg-neutral-950 text-white font-mono text-[8px] text-center font-bold py-0.5 uppercase">
                PREVIEW
              </div>
            </div>

            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-black uppercase text-neutral-600">
                  OFFICIAL ID PHOTO (CLOUDINARY)
                </span>
                {profilePic && (
                  <span className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-400">
                    CUSTOM PHOTO SET
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    }}
                    disabled={isUploading || isSaving}
                  />
                  <div className="inline-flex items-center gap-1.5 font-mono text-xs font-black px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-500 text-neutral-950 border-2 border-neutral-950 shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer">
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>UPLOADING TO CLOUDINARY...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>UPLOAD PHOTO (CLOUDINARY)</span>
                      </>
                    )}
                  </div>
                </label>
              </div>

              <div>
                <input
                  type="text"
                  value={profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                  placeholder="Or enter direct image URL (https://res.cloudinary.com/...)"
                  className="w-full px-2.5 py-1.5 bg-white rounded border-2 border-neutral-950 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Name & Roll Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] font-black uppercase text-neutral-600 mb-1">
                FULL NAME *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alexander Chen"
                required
                className="w-full px-3 py-2 bg-white rounded-lg border-2 border-neutral-950 font-sans text-sm font-bold focus:outline-none focus:border-amber-500 shadow-[1.5px_1.5px_0_#000]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] font-black uppercase text-neutral-600 mb-1">
                ROLL NUMBER / SERIAL
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="21AIT042"
                className="w-full px-3 py-2 bg-white rounded-lg border-2 border-neutral-950 font-mono text-sm font-bold uppercase focus:outline-none focus:border-amber-500 shadow-[1.5px_1.5px_0_#000]"
              />
            </div>
          </div>

          {/* Designation & Category Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] font-black uppercase text-neutral-600 mb-1">
                BADGE DESIGNATION / TITLE *
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="President / Technical Head / Lead"
                required
                className="w-full px-3 py-2 bg-white rounded-lg border-2 border-neutral-950 font-sans text-sm font-bold focus:outline-none focus:border-amber-500 shadow-[1.5px_1.5px_0_#000]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] font-black uppercase text-neutral-600 mb-1">
                CATEGORY FILTER GROUP
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-white rounded-lg border-2 border-neutral-950 font-mono text-xs font-bold focus:outline-none focus:border-amber-500 shadow-[1.5px_1.5px_0_#000]"
              >
                <option value="EXECUTIVES">EXECUTIVES (President / VP / Secretary / Treasurer)</option>
                <option value="TECH">TECH & DEV (Developers / Engineers)</option>
                <option value="OPERATIONS">OPS & PR (Events / Social / Operations)</option>
                <option value="STUDENTS">ALL MEMBERS</option>
              </select>
            </div>
          </div>

          {/* Year & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] font-black uppercase text-neutral-600 mb-1">
                YEAR BATCH
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-lg border-2 border-neutral-950 font-sans text-xs font-bold focus:outline-none focus:border-amber-500 shadow-[1.5px_1.5px_0_#000]"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-black uppercase text-neutral-600 mb-1">
                SECTION
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="A, B, C, or D"
                className="w-full px-3 py-2 bg-white rounded-lg border-2 border-neutral-950 font-mono text-xs font-bold uppercase focus:outline-none focus:border-amber-500 shadow-[1.5px_1.5px_0_#000]"
              />
            </div>
          </div>

          {/* Responsibilities */}
          <div>
            <label className="block font-mono text-[10px] font-black uppercase text-neutral-600 mb-1">
              BADGE RESPONSIBILITIES & DUTIES
            </label>
            <textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              rows={3}
              placeholder="Active departmental member driving student association initiatives, technical workshops, and campus community development."
              className="w-full px-3 py-2 bg-white rounded-lg border-2 border-neutral-950 font-sans text-xs leading-relaxed focus:outline-none focus:border-amber-500 shadow-[1.5px_1.5px_0_#000]"
            />
          </div>

          {/* Skills & Focus Areas */}
          <div>
            <label className="block font-mono text-[10px] font-black uppercase text-neutral-600 mb-1">
              TECHNICAL FOCUS AREAS & SKILLS
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. AI/ML, Full Stack, Cloud, UI/UX, Event Strategy"
              className="w-full px-3 py-2 bg-white rounded-lg border-2 border-neutral-950 font-sans text-xs font-medium focus:outline-none focus:border-amber-500 shadow-[1.5px_1.5px_0_#000]"
            />
          </div>

          {/* LinkedIn Profile */}
          <div>
            <label className="block font-mono text-[10px] font-black uppercase text-neutral-600 mb-1">
              LINKEDIN PROFILE URL
            </label>
            <input
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full px-3 py-2 bg-white rounded-lg border-2 border-neutral-950 font-mono text-xs focus:outline-none focus:border-amber-500 shadow-[1.5px_1.5px_0_#000]"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t-2 border-neutral-950 flex items-center justify-between gap-2.5 flex-wrap">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-mono text-xs font-bold border-2 border-rose-900 shadow-[1.5px_1.5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>DELETING...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                    <span>DELETE BADGE</span>
                  </>
                )}
              </button>
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="px-4 py-2 rounded-lg bg-white hover:bg-neutral-100 text-neutral-950 font-mono text-xs font-bold border-2 border-neutral-950 shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSaving || isUploading || isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-neutral-950 font-mono text-xs font-black border-2 border-neutral-950 shadow-[2.5px_2.5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>SAVING...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'UPDATE ASSOCIATE BADGE' : 'CREATE ASSOCIATE BADGE'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
