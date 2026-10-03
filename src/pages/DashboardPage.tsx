import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '../context/TenantContext';
import DashboardView from '../components/DashboardView';
import { DepartmentEvent } from '../types';

export default function DashboardPage() {
  const {
    currentUser,
    allUsers,
    events,
    announcements,
    registrations,
    isDataLoading,
    activeTenantId,
    activeTenant,
    currentBranding,
    setSelectedEvent
  } = useTenantContext();

  const navigate = useNavigate();

  const handleNavigate = (tabId: string) => {
    const prefix = activeTenantId ? `/${activeTenantId}` : '';
    if (tabId === 'home') {
      navigate(prefix || '/');
    } else {
      navigate(`${prefix}/${tabId}`);
    }
  };

  const handleSelectEvent = (event: DepartmentEvent) => {
    setSelectedEvent(event);
    const prefix = activeTenantId ? `/${activeTenantId}` : '';
    navigate(`${prefix}/events/${event.eventId}`);
  };

  return (
    <DashboardView
      user={currentUser}
      allUsers={allUsers}
      events={events}
      announcements={announcements}
      registrations={registrations}
      onNavigate={handleNavigate}
      onSelectEvent={handleSelectEvent}
      isLoading={isDataLoading}
      activeTenantId={activeTenantId}
      activeTenant={activeTenant}
      branding={currentBranding}
    />
  );
}
