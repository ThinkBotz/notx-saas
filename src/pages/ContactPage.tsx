import React from 'react';
import { useTenantContext } from '../context/TenantContext';
import ContactView from '../components/ContactView';

export default function ContactPage() {
  const {
    currentUser,
    appConfig,
    setAppConfig
  } = useTenantContext();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-2xl mx-auto w-full">
        <ContactView
          user={currentUser}
          supportInfo={appConfig.supportInfo}
          onSupportInfoUpdated={(info) => setAppConfig(prev => ({ ...prev, supportInfo: info }))}
        />
      </div>
    </div>
  );
}
