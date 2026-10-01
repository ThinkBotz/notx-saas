import React from 'react';
import { Mail, Linkedin, Shield, Award, Terminal, Heart, Calendar } from 'lucide-react';
import { UserProfile, DepartmentEvent, AppBranding, DEFAULT_BRANDING, Tenant } from '../types';

interface MembersViewProps {
  allUsers: UserProfile[];
  events: DepartmentEvent[];
  branding?: AppBranding;
  activeTenant?: Tenant | null;
}

export default function MembersView({ allUsers, events, branding = DEFAULT_BRANDING, activeTenant }: MembersViewProps) {
  // Sort users into sections
  const patrons = allUsers.filter(u => u.role === 'admin' && !u.isSuperAdmin);
  const executive = allUsers.filter(u => u.role === 'president' || (u.role === 'associate' && u.position?.toLowerCase().includes('president')));
  const leads = allUsers.filter(u => u.role === 'associate' && !u.position?.toLowerCase().includes('president'));
  const coordinators = allUsers.filter(u => u.role === 'coordinator');
  const generalBody = allUsers.filter(u => u.role === 'student');

  // Group coordinators by event
  const coordinatorsByEvent: Record<string, UserProfile[]> = {};
  coordinators.forEach(coord => {
    if (coord.assignedEvents && coord.assignedEvents.length > 0) {
      coord.assignedEvents.forEach(eventId => {
        if (!coordinatorsByEvent[eventId]) coordinatorsByEvent[eventId] = [];
        coordinatorsByEvent[eventId].push(coord);
      });
    } else {
      if (!coordinatorsByEvent['unassigned']) coordinatorsByEvent['unassigned'] = [];
      coordinatorsByEvent['unassigned'].push(coord);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-36 sm:pb-32 space-y-6 bg-[var(--nb-bg)] text-[var(--nb-content)]">
      
      {/* Title */}
      <div 
        className="p-4 rounded-lg bg-[var(--nb-surface)]"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
      >
        <h3 className="nb-headline text-xl leading-none">Association Directory</h3>
        <p className="nb-label text-xs mt-1 text-[var(--nb-secondary)]">
          Meet the thinkers and creators powering {branding.appName || activeTenant?.name || 'NOTX'} {branding.tagline || 'Connect'}
        </p>
      </div>

      {/* 1. Patrons / Faculty Advisor */}
      {patrons.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-coral)] text-white"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Shield className="w-3.5 h-3.5" />
            </div>
            <h4 className="nb-headline text-sm tracking-normal">Patrons &amp; Faculty Advisory</h4>
            <span className="nb-pill-coral text-[10px] ml-auto font-mono">{patrons.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {patrons.map(member => (
              <div 
                key={member.uid} 
                className="bg-[var(--nb-surface)] p-4 rounded-lg flex gap-4 transition-all"
                style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div 
                  className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-[var(--nb-surface-accent)]"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <img 
                    src={member.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`} 
                    alt={member.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="nb-headline text-sm tracking-normal truncate">{member.name}</h5>
                  <span className="nb-pill-coral text-[9.5px] font-mono font-bold mt-1 inline-block truncate max-w-full">{member.position}</span>
                  {member.responsibilities && (
                    <p className="text-xs text-[var(--nb-secondary)] mt-2 leading-relaxed font-sans">{member.responsibilities}</p>
                  )}
                  
                  <div className="flex gap-2 mt-3 pt-2 border-t border-[var(--nb-divider)]">
                    <a 
                      href={`mailto:${member.email}`} 
                      className="nb-btn-icon !min-w-[32px] !min-h-[32px] w-8 h-8 rounded"
                      title="Send Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Executive Committee */}
      {executive.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-yellow)] text-neutral-900"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Award className="w-3.5 h-3.5" />
            </div>
            <h4 className="nb-headline text-sm tracking-normal">Executive Leadership</h4>
            <span className="nb-pill-yellow text-[10px] ml-auto font-mono">{executive.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {executive.map(member => (
              <div 
                key={member.uid} 
                className="bg-[var(--nb-surface)] p-4 rounded-lg flex gap-4 transition-all"
                style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div 
                  className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-[var(--nb-surface-accent)]"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <img 
                    src={member.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`} 
                    alt={member.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="nb-headline text-sm tracking-normal truncate">{member.name}</h5>
                  <span className="nb-pill-yellow text-[9.5px] font-mono font-bold mt-1 inline-block truncate max-w-full">
                    {member.position} {member.year ? `• ${member.year}` : ''}
                  </span>
                  {member.responsibilities && (
                    <p className="text-xs text-[var(--nb-secondary)] mt-2 leading-relaxed font-sans">{member.responsibilities}</p>
                  )}
                  
                  <div className="flex gap-2 mt-3 pt-2 border-t border-[var(--nb-divider)]">
                    <a 
                      href={`mailto:${member.email}`} 
                      className="nb-btn-icon !min-w-[32px] !min-h-[32px] w-8 h-8 rounded"
                      title="Send Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                    {member.linkedin && (
                      <a 
                        href={member.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="nb-btn-icon !min-w-[32px] !min-h-[32px] w-8 h-8 rounded hover:text-[#0A66C2]"
                        title="LinkedIn"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Team Leads */}
      {leads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-blue)] text-white"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <h4 className="nb-headline text-sm tracking-normal">Technical &amp; Creative Leads</h4>
            <span className="nb-pill-blue text-[10px] ml-auto font-mono">{leads.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {leads.map(member => (
              <div 
                key={member.uid} 
                className="bg-[var(--nb-surface)] p-4 rounded-lg flex gap-4 transition-all"
                style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
              >
                <div 
                  className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-[var(--nb-surface-accent)]"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  <img 
                    src={member.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`} 
                    alt={member.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="nb-headline text-sm tracking-normal">{member.name}</h5>
                  <p className="nb-label text-[10px] text-[var(--nb-accent)] mt-0.5">
                    {member.position} {member.year ? `• ${member.year}` : ''}
                  </p>
                  {member.responsibilities && (
                    <p className="text-xs text-[var(--nb-secondary)] mt-2 leading-relaxed font-sans">{member.responsibilities}</p>
                  )}
                  
                  <div className="flex gap-2 mt-3 pt-2 border-t border-[var(--nb-divider)]">
                    <a 
                      href={`mailto:${member.email}`} 
                      className="nb-btn-icon !min-w-[32px] !min-h-[32px] w-8 h-8 rounded"
                      title="Send Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                    {member.linkedin && (
                      <a 
                        href={member.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="nb-btn-icon !min-w-[32px] !min-h-[32px] w-8 h-8 rounded hover:text-[#0A66C2]"
                        title="LinkedIn"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coordinators by Event */}
      {coordinators.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-purple)] text-white"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <h4 className="nb-headline text-sm tracking-normal">Event Coordinators</h4>
            <span className="nb-pill-purple text-[10px] ml-auto font-mono">{coordinators.length}</span>
          </div>

          <div className="space-y-4">
            {Object.entries(coordinatorsByEvent).map(([eventId, eventCoordinators]) => {
              const event = events.find(e => e.eventId === eventId);
              const title = event ? event.title : (eventId === 'unassigned' ? 'General Coordinators' : 'Unknown Event');
              
              return (
                <div 
                  key={eventId} 
                  className="bg-[var(--nb-surface)] p-4 rounded-lg space-y-3"
                  style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
                >
                  <h5 className="nb-headline text-xs text-[var(--nb-purple)] uppercase tracking-wider border-b border-[var(--nb-divider)] pb-2">
                    {title}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {eventCoordinators.map(member => (
                      <div 
                        key={member.uid} 
                        className="flex gap-3.5 p-2.5 rounded-md bg-[var(--nb-surface-accent)]"
                        style={{ border: '1px solid var(--nb-divider)' }}
                      >
                        <div 
                          className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-[var(--nb-surface)]"
                          style={{ border: '1.5px solid var(--nb-ink)' }}
                        >
                          <img 
                            src={member.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`} 
                            alt={member.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="nb-headline text-xs tracking-normal truncate">{member.name}</h6>
                          <span className="nb-pill-purple text-[9px] font-mono font-bold mt-1 inline-block truncate max-w-full">
                            {member.position} {member.year ? `• ${member.year}` : ''}
                          </span>
                          <div className="flex gap-2 mt-2">
                            <a 
                              href={`mailto:${member.email}`} 
                              className="nb-btn-icon !min-w-[28px] !min-h-[28px] w-7 h-7 rounded"
                              title="Send Email"
                            >
                              <Mail className="w-3 h-3" />
                            </a>
                            {member.linkedin && (
                              <a 
                                href={member.linkedin} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="nb-btn-icon !min-w-[28px] !min-h-[28px] w-7 h-7 rounded hover:text-[#0A66C2]"
                                title="LinkedIn"
                              >
                                <Linkedin className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. General Body */}
      {generalBody.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[var(--nb-ink)] pb-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center bg-[var(--nb-green)] text-neutral-900"
              style={{ border: '1.5px solid var(--nb-ink)', boxShadow: '1.5px 1.5px 0 var(--nb-ink)' }}
            >
              <Heart className="w-3.5 h-3.5" />
            </div>
            <h4 className="nb-headline text-sm tracking-normal">Active Student Registry</h4>
            <span className="nb-pill-green text-[10px] ml-auto font-mono">{generalBody.length}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {generalBody.map(member => (
              <div 
                key={member.uid} 
                className="bg-[var(--nb-surface)] px-3 py-2.5 rounded-md flex justify-between items-center gap-2"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-9 h-9 rounded overflow-hidden flex-shrink-0 bg-[var(--nb-surface-accent)]"
                    style={{ border: '1px solid var(--nb-ink)' }}
                  >
                    <img 
                      src={member.profile_pic || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.rollNumber || member.uid}`} 
                      alt={member.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0">
                    <h5 className="nb-headline text-xs tracking-normal truncate">{member.name}</h5>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] font-bold text-[var(--nb-secondary)]">{member.rollNumber}</span>
                      <span className="text-[10px] text-[var(--nb-tertiary)]">• {member.section ? `Sec ${member.section}` : ''} {member.year ? `(${member.year})` : ''}</span>
                    </div>
                  </div>
                </div>
                {member.skills && (
                  <span className="nb-tag text-[9px] max-w-[80px] truncate">
                    {member.skills.split(',')[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
