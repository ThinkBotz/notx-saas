import React from 'react';
import { 
  Cpu, 
  Bot, 
  Sparkles, 
  Terminal, 
  Code2, 
  Zap, 
  Rocket, 
  Atom, 
  Flame, 
  ShieldCheck, 
  Radio, 
  Layers, 
  GraduationCap, 
  Compass, 
  Globe, 
  Trophy 
} from 'lucide-react';
import { AppBranding, DEFAULT_BRANDING } from '../types';

export const BRAND_ICONS: Record<string, React.ElementType> = {
  Cpu,
  Bot,
  Sparkles,
  Terminal,
  Code2,
  Zap,
  Rocket,
  Atom,
  Flame,
  ShieldCheck,
  Radio,
  Layers,
  GraduationCap,
  Compass,
  Globe,
  Trophy
};

// Neo-brutalist flat colour palette for accent themes.
// hex = raw colour for CSS var injection (--nb-accent)
// fg  = foreground on top of that colour
// solid Tailwind classes used for logo bg, tags, etc.
export const ACCENT_THEMES: Record<string, {
  hex: string;
  fg: string;
  // legacy fields kept so existing code that destructures these doesn't break
  border: string;
  glow: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  primaryBg: string;
}> = {
  indigo: {
    hex: '#2563EB',
    fg:  '#FFFFFF',
    border:      'border-blue-600',
    glow:        '',
    iconColor:   'text-white',
    badgeBg:     'bg-blue-600',
    badgeText:   'text-white',
    badgeBorder: 'border-blue-700',
    primaryBg:   'bg-blue-600 hover:bg-blue-700'
  },
  violet: {
    hex: '#7C3AED',
    fg:  '#FFFFFF',
    border:      'border-violet-600',
    glow:        '',
    iconColor:   'text-white',
    badgeBg:     'bg-violet-600',
    badgeText:   'text-white',
    badgeBorder: 'border-violet-700',
    primaryBg:   'bg-violet-600 hover:bg-violet-700'
  },
  emerald: {
    hex: '#00D26A',
    fg:  '#111111',
    border:      'border-emerald-500',
    glow:        '',
    iconColor:   'text-gray-900',
    badgeBg:     'bg-emerald-500',
    badgeText:   'text-gray-900',
    badgeBorder: 'border-emerald-600',
    primaryBg:   'bg-emerald-500 hover:bg-emerald-600'
  },
  cyan: {
    hex: '#00B4D8',
    fg:  '#FFFFFF',
    border:      'border-cyan-500',
    glow:        '',
    iconColor:   'text-white',
    badgeBg:     'bg-cyan-500',
    badgeText:   'text-white',
    badgeBorder: 'border-cyan-600',
    primaryBg:   'bg-cyan-500 hover:bg-cyan-600'
  },
  amber: {
    hex: '#FFE600',
    fg:  '#111111',
    border:      'border-amber-400',
    glow:        '',
    iconColor:   'text-gray-900',
    badgeBg:     'bg-amber-400',
    badgeText:   'text-gray-900',
    badgeBorder: 'border-amber-500',
    primaryBg:   'bg-amber-400 hover:bg-amber-500'
  },
  rose: {
    hex: '#FF2A85',
    fg:  '#FFFFFF',
    border:      'border-pink-600',
    glow:        '',
    iconColor:   'text-white',
    badgeBg:     'bg-pink-600',
    badgeText:   'text-white',
    badgeBorder: 'border-pink-700',
    primaryBg:   'bg-pink-600 hover:bg-pink-700'
  }
};

/** Returns the hex accent colour for a given accent key (safe fallback to indigo) */
export function getCssAccent(accentKey?: string): string {
  return (ACCENT_THEMES[accentKey || 'indigo'] || ACCENT_THEMES.indigo).hex;
}

/** Returns the foreground colour for use on top of the accent (black or white) */
export function getCssAccentFg(accentKey?: string): string {
  return (ACCENT_THEMES[accentKey || 'indigo'] || ACCENT_THEMES.indigo).fg;
}

interface BrandLogoProps {
  branding?: AppBranding;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function BrandLogo({
  branding = DEFAULT_BRANDING,
  size = 'md',
  className = ''
}: BrandLogoProps) {
  const accentKey = branding.accentColor || 'indigo';
  const accentHex = getCssAccent(accentKey);
  const accentFg  = getCssAccentFg(accentKey);

  // Size map: flat square badge with 2px ink border + solid accent background
  const sizeMap = {
    xs: { wh: 'w-6 h-6',         radius: 'rounded',    icon: 'w-3.5 h-3.5' },
    sm: { wh: 'w-8 h-8',         radius: 'rounded-md',  icon: 'w-4 h-4'     },
    md: { wh: 'w-9 h-9',         radius: 'rounded-md',  icon: 'w-4.5 h-4.5' },
    lg: { wh: 'w-12 h-12',       radius: 'rounded-lg',  icon: 'w-6 h-6'     },
    xl: { wh: 'w-16 h-16',       radius: 'rounded-xl',  icon: 'w-8 h-8'     },
  }[size];

  const containerStyle: React.CSSProperties = {
    backgroundColor: accentHex,
    color: accentFg,
    flexShrink: 0,
  };

  // Custom uploaded logo
  if (branding.logoType === 'custom' && branding.logoImageUrl) {
    return (
      <div
        className={`${sizeMap.wh} ${sizeMap.radius} overflow-hidden flex items-center justify-center ${className}`}
        style={containerStyle}
      >
        <img
          src={branding.logoImageUrl}
          alt={branding.appName || 'Logo'}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Preset Icon Logo
  const IconComponent = BRAND_ICONS[branding.logoIcon || 'Cpu'] || Cpu;

  return (
    <div
      className={`${sizeMap.wh} ${sizeMap.radius} flex items-center justify-center ${className}`}
      style={containerStyle}
    >
      <IconComponent className={sizeMap.icon} style={{ color: accentFg }} />
    </div>
  );
}
