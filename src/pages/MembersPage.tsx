import React from 'react';
import { useTenantContext } from '../context/TenantContext';
import MembersView from '../components/MembersView';

export default function MembersPage() {
  const {
    allUsers,
    events,
    currentBranding,
    activeTenant
  } = useTenantContext();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-4xl mx-auto w-full">
        <MembersView 
          allUsers={allUsers} 
          events={events} 
          branding={currentBranding} 
          activeTenant={activeTenant} 
        />
      </div>
    </div>
  );
}
