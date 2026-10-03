import React from 'react';
import { Home, Calendar, Image as ImageIcon, Volume2, User, WifiOff } from 'lucide-react';
import './FloatingDockNav.css';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string | boolean;
  isPing?: boolean;
}

export interface FloatingDockNavProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isOffline?: boolean;
  className?: string;
}

export const FloatingDockNav: React.FC<FloatingDockNavProps> = ({
  activeTab,
  onTabChange,
  isOffline = false,
  className = ''
}) => {
  const navItems: NavItemConfig[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: ImageIcon
    },
    {
      id: 'announcements',
      label: 'Bulletin',
      icon: Volume2
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User
    }
  ];

  return (
    <div className={`floating-dock-wrapper select-none ${className}`}>
      {/* Offline Warning Banner if disconnected */}
      {isOffline && (
        <div
          className="floating-dock-offline-pill"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <WifiOff className="w-3 h-3" />
          <span>Offline Mode</span>
        </div>
      )}

      {/* Floating Dock Nav Container (React Bits Pro Mobile 3 Style) */}
      <nav
        className="floating-dock-container"
        role="navigation"
        aria-label="App Navigation"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="floating-dock-glass-layer" />
        
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTabChange(item.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
              data-tab={item.id}
              className={`floating-dock-item ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              {/* Icon + badge */}
              <div className="floating-dock-icon-wrapper">
                <Icon className="floating-dock-icon" />

                {item.badge !== undefined && (
                  item.isPing ? (
                    <span className="floating-dock-ping-badge">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--nb-coral)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--nb-coral)] border border-[var(--nb-surface)]" />
                    </span>
                  ) : (
                    <span className="floating-dock-counter-badge">
                      {item.badge}
                    </span>
                  )
                )}
              </div>

              {/* Label */}
              <span className="floating-dock-label">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default FloatingDockNav;
