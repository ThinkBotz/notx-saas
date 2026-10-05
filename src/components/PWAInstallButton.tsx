import React, { useState } from 'react';
import { usePWAInstall } from '../usePWAInstall';
import { Download, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState<'ios' | 'android' | null>(null);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // 1. iOS Safari Flow (Webkit does not fire beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide('ios')}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-bold uppercase font-mono bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-all shadow-[2px_2px_0_#000] border-1.5 border-black"
          title="Add NOTX to iPhone / iPad Home Screen"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add to Home</span>
          <span className="sm:hidden">Install</span>
        </button>

        {showGuide === 'ios' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
            <div 
              className="w-full max-w-sm rounded-lg bg-[var(--nb-surface)] p-6 relative text-[var(--nb-content)] space-y-4"
              style={{ border: '2.5px solid var(--nb-ink)', boxShadow: '4px 4px 0 #000' }}
            >
              <button
                type="button"
                onClick={() => setShowGuide(null)}
                className="nb-btn-ghost absolute top-4 right-4 w-7 h-7 rounded flex items-center justify-center cursor-pointer"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <X className="w-4 h-4" />
              </button>
              
              <div 
                className="w-12 h-12 rounded bg-amber-400 border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0_#000]"
              >
                <Download className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black text-white">
                    iOS SAFARI
                  </span>
                  <span className="text-[10px] font-mono font-bold text-neutral-500">
                    STANDALONE APP
                  </span>
                </div>
                <h3 className="nb-headline text-lg text-[var(--nb-content)]">Install on iPhone / iPad</h3>
                <p className="mt-2 text-xs text-[var(--nb-secondary)] leading-relaxed space-y-1.5">
                  <span className="block">1. Tap the <strong>Share</strong> icon (square with arrow ↑) at the bottom of Safari.</span>
                  <span className="block">2. Scroll down and select <strong>Add to Home Screen</strong>.</span>
                  <span className="block">3. Tap <strong>Add</strong> in the top-right corner to finish.</span>
                </p>
                <div className="mt-3 p-2.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[11px] font-mono text-neutral-600 dark:text-neutral-300">
                  ⚡ Running from your Home Screen enables full-screen mode and instant pass access!
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowGuide(null)}
                className="w-full nb-btn text-xs font-bold uppercase tracking-wider py-2.5 rounded cursor-pointer bg-black text-white hover:bg-neutral-900 border-2 border-black shadow-[2px_2px_0_#000]"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. Android / Chromium Native Prompt (Method A: WebAPK)
  if (isInstallable || isAndroid) {
    const handleAndroidClick = async () => {
      if (isInstallable) {
        const success = await install();
        if (!success && isAndroid) {
          setShowGuide('android');
        }
      } else {
        setShowGuide('android');
      }
    };

    return (
      <>
        <button
          type="button"
          onClick={handleAndroidClick}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-bold uppercase font-mono bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-all shadow-[2px_2px_0_#000] border-1.5 border-black"
          title="Install WebAPK directly on your device"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install WebAPK</span>
          <span className="sm:hidden">Install</span>
        </button>

        {showGuide === 'android' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
            <div 
              className="w-full max-w-sm rounded-lg bg-[var(--nb-surface)] p-6 relative text-[var(--nb-content)] space-y-4"
              style={{ border: '2.5px solid var(--nb-ink)', boxShadow: '4px 4px 0 #000' }}
            >
              <button
                type="button"
                onClick={() => setShowGuide(null)}
                className="nb-btn-ghost absolute top-4 right-4 w-7 h-7 rounded flex items-center justify-center cursor-pointer"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <X className="w-4 h-4" />
              </button>
              
              <div 
                className="w-12 h-12 rounded bg-emerald-400 border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0_#000]"
              >
                <Download className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black text-white">
                    METHOD A • WEBAPK
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600">
                    NATIVE ANDROID
                  </span>
                </div>
                <h3 className="nb-headline text-lg text-[var(--nb-content)]">Install Native WebAPK</h3>
                <p className="mt-2 text-xs text-[var(--nb-secondary)] leading-relaxed space-y-1.5">
                  <span className="block">1. Tap the <strong>Three Dots (⋮)</strong> menu in Google Chrome.</span>
                  <span className="block">2. Select <strong>Install App</strong> or <strong>Add to Home screen</strong>.</span>
                  <span className="block">3. Confirm installation — Android will generate and install the native WebAPK package in the background.</span>
                </p>
                <div className="mt-3 p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 space-y-1">
                  <p className="font-bold">✓ WebAPK Benefits Active:</p>
                  <p>• Zero play store download delay</p>
                  <p>• Instant attendance scan alerts & notifications</p>
                  <p>• Auto-updates silently on each cloud release</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowGuide(null)}
                className="w-full nb-btn text-xs font-bold uppercase tracking-wider py-2.5 rounded cursor-pointer bg-black text-white hover:bg-neutral-900 border-2 border-black shadow-[2px_2px_0_#000]"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
export default PWAInstallButton;
