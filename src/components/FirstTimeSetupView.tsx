import React, { useState } from 'react';
import { UserProfile } from '../types';
import { updateUserProfile, auth } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { hashPassword, recordUserActivity } from '../utils/auth';
import { Sparkles, Phone, ShieldCheck, Loader2, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';

interface FirstTimeSetupViewProps {
  user: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
}

export default function FirstTimeSetupView({ user, onComplete }: FirstTimeSetupViewProps) {
  // Check if this is just a password reset (i.e., user already has data)
  const isPasswordResetOnly = Boolean(user.phone && user.year && user.section);

  const [phone, setPhone] = useState(user.phone || '');
  const [year, setYear] = useState(user.year || '3rd Year');
  const [section, setSection] = useState(user.section || 'A');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword || (!isPasswordResetOnly && (!phone || !year || !section))) {
      setError('Please fill in all required fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    
    try {
      // Sync with Firebase Auth if user is currently signed in
      if (auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, newPassword.trim());
        } catch (authErr) {
          console.warn('Firebase Auth password update warning in FirstTimeSetupView:', authErr);
        }
      }

      // Hash the password securely using salted SHA-256
      const hashedPassword = await hashPassword(newPassword);

      const updates: Partial<UserProfile> = {
        password: hashedPassword,
        isFirstLogin: false
      };
      
      if (!isPasswordResetOnly) {
        Object.assign(updates, { phone, year, section });
      }
      
      await updateUserProfile(user.uid, updates);
      
      const updatedUser = { ...user, ...updates } as UserProfile;
      recordUserActivity();
      onComplete(updatedUser);
    } catch (err) {
      console.error(err);
      setError('Failed to save details. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-[var(--nb-bg)] flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-[var(--nb-surface)] rounded-lg p-6 sm:p-7 relative overflow-hidden"
        style={{ border: '2.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
      >
        <div className="text-center mb-6">
          <div 
            className="inline-flex p-3 bg-[var(--nb-yellow)] rounded-lg mb-3 text-neutral-900 shadow-[2px_2px_0_var(--nb-ink)]"
            style={{ border: '2px solid var(--nb-ink)' }}
          >
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-display font-black text-2xl text-[var(--nb-content)] mb-1">
            {isPasswordResetOnly ? `Reset Password, ${user.rollNumber}` : `Welcome, ${user.rollNumber}!`}
          </h2>
          <p className="text-xs font-mono font-bold text-[var(--nb-secondary)]">
            {isPasswordResetOnly ? "SET A NEW SECURE PASSWORD FOR YOUR ACCOUNT" : "COMPLETE YOUR PROFILE SETUP TO ENTER THE WORKSPACE"}
          </p>
        </div>

        {error && (
          <div 
            className="mb-4 text-xs font-bold text-rose-600 bg-rose-500/10 p-3 rounded-lg text-center"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isPasswordResetOnly && (
            <>
              <div>
                <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">PHONE NUMBER *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nb-secondary)]" />
                  <input 
                    type="tel" 
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-[var(--nb-surface-accent)] text-xs font-bold text-[var(--nb-content)] rounded py-2.5 pl-9 pr-3 outline-none"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">YEAR *</label>
                  <select 
                    value={year} 
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-[var(--nb-surface-accent)] text-xs font-bold text-[var(--nb-content)] rounded py-2.5 px-3 outline-none"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">SECTION *</label>
                  <input 
                    type="text" 
                    required
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="A"
                    className="w-full bg-[var(--nb-surface-accent)] text-xs font-bold text-[var(--nb-content)] rounded py-2.5 px-3 outline-none uppercase font-mono"
                    style={{ border: '1.5px solid var(--nb-ink)' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* New Password */}
          <div>
            <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">SET NEW PASSWORD (MIN 6 CHARS) *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nb-secondary)]" />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Choose a strong password"
                className="w-full bg-[var(--nb-surface-accent)] text-xs font-bold text-[var(--nb-content)] rounded py-2.5 pl-9 pr-10 outline-none"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block nb-label text-[10px] text-[var(--nb-secondary)] mb-1">CONFIRM NEW PASSWORD *</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nb-secondary)]" />
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full bg-[var(--nb-surface-accent)] text-xs font-bold text-[var(--nb-content)] rounded py-2.5 pl-9 pr-10 outline-none"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && confirmPassword && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono">
                {newPassword === confirmPassword ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </span>
                ) : (
                  <span className="text-rose-500">Passwords do not match</span>
                )}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full nb-btn text-xs font-bold uppercase tracking-wider rounded-lg py-3 mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: '3px 3px 0 var(--nb-ink)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isPasswordResetOnly ? "Update Password" : "Save & Enter Platform")}
          </button>
        </form>
      </div>
    </div>
  );
}
