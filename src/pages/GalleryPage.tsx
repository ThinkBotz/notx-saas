import React from 'react';
import { useTenantContext } from '../context/TenantContext';
import GalleryView from '../components/GalleryView';

export default function GalleryPage() {
  const {
    currentUser,
    albums,
    refreshAllData,
    activeTenantId
  } = useTenantContext();

  return (
    <GalleryView
      user={currentUser}
      albums={albums}
      refreshData={refreshAllData}
      activeTenantId={activeTenantId}
    />
  );
}
