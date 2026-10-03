import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantContext } from '../context/TenantContext';
import EventsView from '../components/EventsView';
import { DepartmentEvent } from '../types';

export default function EventsPage() {
  const {
    currentUser,
    allUsers,
    events,
    registrations,
    refreshAllData,
    selectedEvent,
    setSelectedEvent,
    isDataLoading,
    activeTenantId,
    activeTenant,
    currentBranding
  } = useTenantContext();

  const { eventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();

  // Deep-link support: if eventId is in the URL, auto-select that event
  useEffect(() => {
    if (eventId && events.length > 0) {
      const match = events.find(e => e.eventId === eventId);
      if (match) {
        setSelectedEvent(match);
      }
    }
  }, [eventId, events, setSelectedEvent]);

  const handleSetSelectedEvent = (ev: DepartmentEvent | null) => {
    setSelectedEvent(ev);
    const prefix = activeTenantId ? `/${activeTenantId}` : '';
    if (ev) {
      navigate(`${prefix}/events/${ev.eventId}`, { replace: true });
    } else {
      navigate(`${prefix}/events`, { replace: true });
    }
  };

  return (
    <EventsView
      user={currentUser}
      allUsers={allUsers}
      events={events}
      registrations={registrations}
      refreshEvents={refreshAllData}
      refreshRegistrations={refreshAllData}
      selectedEvent={selectedEvent}
      setSelectedEvent={handleSetSelectedEvent}
      isLoading={isDataLoading}
      activeTenantId={activeTenantId}
      activeTenant={activeTenant}
      branding={currentBranding}
    />
  );
}
