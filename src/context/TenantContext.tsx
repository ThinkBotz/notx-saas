import React, { createContext, useContext } from 'react';
import { 
  UserProfile, 
  DepartmentEvent, 
  EventRegistration, 
  Album, 
  Announcement, 
  AppConfig, 
  AppBranding, 
  Tenant 
} from '../types';

export interface TenantContextType {
  currentUser: UserProfile;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  activeTenantId: string;
  activeTenant: Tenant | null;
  currentBranding: AppBranding;
  appConfig: AppConfig;
  setAppConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  events: DepartmentEvent[];
  registrations: EventRegistration[];
  albums: Album[];
  announcements: Announcement[];
  allUsers: UserProfile[];
  refreshAllData: (tenantId?: string) => Promise<void>;
  isDataLoading: boolean;
  onLogout: () => void;
  selectedEvent: DepartmentEvent | null;
  setSelectedEvent: React.Dispatch<React.SetStateAction<DepartmentEvent | null>>;
}

export const TenantContext = createContext<TenantContextType | null>(null);

export function useTenantContext(): TenantContextType {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantContext must be used within a TenantLayout or TenantProvider');
  }
  return context;
}
