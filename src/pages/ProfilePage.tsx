import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '../context/TenantContext';
import ProfileView from '../components/ProfileView';

export default function ProfilePage() {
  const {
    currentUser,
    setCurrentUser,
    registrations,
    events,
    allUsers,
    onLogout,
    refreshAllData,
    appConfig,
    setAppConfig,
    currentBranding,
    activeTenantId,
    activeTenant
  } = useTenantContext();

  const navigate = useNavigate();
  const prefix = activeTenantId ? `/${activeTenantId}` : '';

  const handleTabChange = (tabId: string) => {
    if (tabId === 'home') {
      navigate(prefix || '/');
    } else {
      navigate(`${prefix}/${tabId}`);
    }
  };

  return (
    <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
      <ProfileView
        user={currentUser}
        setUser={setCurrentUser}
        registrations={registrations}
        events={events}
        allUsers={allUsers}
        onLogout={onLogout}
        refreshUsers={refreshAllData}
        onOpenAdminPanel={() => navigate(`${prefix}/admin`)}
        setActiveTab={handleTabChange}
        supportInfo={appConfig?.supportInfo}
        branding={currentBranding}
        isCertificatesEnabled={appConfig?.isCertificatesEnabled ?? true}
        certificateTemplate={appConfig?.certificateTemplate}
        onOpenSupportBox={() => navigate(`${prefix}/contact`)}
        onOpenMembers={() => navigate(`${prefix}/members`)}
        onSupportInfoUpdated={(info) => setAppConfig(prev => prev ? ({ ...prev, supportInfo: info }) : prev)}
        activeTenantId={activeTenantId}
        activeTenant={activeTenant}
      />
    </div>
  );
}
