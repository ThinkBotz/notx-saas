import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTenantContext } from '../context/TenantContext';
import AdminPanelView from '../components/AdminPanelView';
import { SUPER_ADMIN_EMAILS } from '../types';

export default function AdminPage() {
  const {
    currentUser,
    allUsers,
    events,
    registrations,
    refreshAllData,
    activeTenantId,
    activeTenant
  } = useTenantContext();

  const navigate = useNavigate();

  const isSuper = currentUser && (
    currentUser.isSuperAdmin || 
    SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase())
  );

  const canAccess = isSuper || [
    'admin', 
    'president', 
    'associate', 
    'coordinator'
  ].includes(currentUser.role);

  if (!canAccess) {
    const prefix = activeTenantId ? `/${activeTenantId}` : '/';
    return <Navigate to={prefix} replace />;
  }

  const handleClose = () => {
    const prefix = activeTenantId ? `/${activeTenantId}` : '';
    navigate(`${prefix}/profile`);
  };

  return (
    <AdminPanelView
      currentUser={currentUser}
      allUsers={allUsers}
      events={events}
      registrations={registrations}
      onClose={handleClose}
      refreshData={refreshAllData}
      activeTenantId={activeTenantId}
      activeTenant={activeTenant}
    />
  );
}
