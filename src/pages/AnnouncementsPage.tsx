import React from 'react';
import { useTenantContext } from '../context/TenantContext';
import AnnouncementsView from '../components/AnnouncementsView';

export default function AnnouncementsPage() {
  const {
    currentUser,
    announcements,
    refreshAllData,
    activeTenantId
  } = useTenantContext();

  return (
    <AnnouncementsView
      user={currentUser}
      announcements={announcements}
      refreshAnnouncements={refreshAllData}
      activeTenantId={activeTenantId}
    />
  );
}
