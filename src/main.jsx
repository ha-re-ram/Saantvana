import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Edit3,
  ExternalLink,
  Globe,
  Heart,
  Home,
  LifeBuoy,
  Maximize2,
  Menu,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  MonitorOff,
  Moon,
  MoreHorizontal,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Smile,
  Sparkles,
  Sun,
  Trash2,
  User,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Waves,
  X
} from 'lucide-react';
import './styles.css';

import { useMachine } from './machines/useMachine.js';
import {
  breathingMachine,
  BREATHING_STATES,
  BREATHING_EVENTS,
  getBreathingView
} from './machines/breathingMachine.js';
import {
  depthMachine,
  VIEWER_STATES,
  CONSENT_STATES,
  DEPTH_EVENTS,
  initialDepthContext
} from './machines/depthMachine.js';
import {
  callMachine,
  CALL_EVENTS,
  initialCallContext
} from './machines/callMachine.js';

// Official Google Meet Logo
function GoogleMeetLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: 'none' }}>
      <path fill="#00832d" d="M14 12l3.5-2.5v5L14 12z"/>
      <path fill="#0066da" d="M14 6.5H5.5C4.67 6.5 4 7.17 4 8v8c0 .83.67 1.5 1.5 1.5H14c.83 0 1.5-.67 1.5-1.5V8c0-.83-.67-1.5-1.5-1.5z"/>
      <path fill="#e94235" d="M4 16v1.5C4 18.33 4.67 19 5.5 19H14v-3H4z"/>
      <path fill="#f9bc05" d="M17.5 9.5L14 12v-5.5h-8.5C4.67 6.5 4 7.17 4 8v1.5h10V7l3.5 2.5z"/>
      <path fill="#2684fc" d="M14 12l3.5 2.5V9.5L14 12z"/>
    </svg>
  );
}

// Sound chime using native Web Audio API (zero audio file dependencies)
function playGentleChime(freq = 528) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {}
}

const defaultContacts = [
  { id: 'contact-1', name: 'Maya Chen', group: 'Friends', relation: 'Close friend', initials: 'MC', color: 'peach', time: 'Active today', meetLink: '', saved: true },
  { id: 'contact-2', name: 'Jordan Lee', group: 'Family', relation: 'Brother', initials: 'JL', color: 'blue', time: 'Yesterday', meetLink: '', saved: true },
  { id: 'contact-3', name: 'Sam Rivera', group: 'Community', relation: 'Community peer', initials: 'SR', color: 'green', time: 'This week', meetLink: '', saved: true },
];

const connectionPrompts = [
  { id: 1, quote: 'Who’s someone you feel a little more yourself around?', hint: 'Think of someone who accepts you just as you are.' },
  { id: 2, quote: 'What is a small memory with someone that brings a quiet smile?', hint: 'A shared joke, an unexpected laugh, or a quiet walk.' },
  { id: 3, quote: 'If you could share five minutes of calm silence with anyone, who would it be?', hint: 'Someone whose presence alone feels grounding.' }
];

function App() {
  const [page, setPage] = useState('Home');
  const [selectedGroup, setSelectedGroup] = useState('Everyone');
  const [inviteName, setInviteName] = useState('');
  const [notice, setNotice] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [inviteRoom, setInviteRoom] = useState('');

  // Modals & Popovers
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [activePromptText, setActivePromptText] = useState('');

  // Call sessions
  const [callChoiceTarget, setCallChoiceTarget] = useState(null); // Contact selected for call
  const [call, setCall] = useState(null); // Active Saantvana WebRTC call
  const [activeMeetSession, setActiveMeetSession] = useState(null); // Active Google Meet companion mode

  // Persistent User Profile
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('saantvana:profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { name: 'Alex Morgan', space: 'Personal wellbeing', color: 'lilac', theme: 'light', defaultMic: true, defaultCam: true };
  });

  const saveProfile = (updated) => {
    setProfile(updated);
    try { localStorage.setItem('saantvana:profile', JSON.stringify(updated)); } catch {}
  };

  // Sync theme
  useEffect(() => {
    if (profile.theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [profile.theme]);

  // Persistent Connections
  const [connections, setConnections] = useState(() => {
    try {
      const saved = localStorage.getItem('saantvana:connections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultContacts;
  });

  const saveConnections = (nextList) => {
    setConnections(nextList);
    try { localStorage.setItem('saantvana:connections', JSON.stringify(nextList)); } catch {}
  };

  // Persistent Reflections
  const [reflections, setReflections] = useState(() => {
    try {
      const saved = localStorage.getItem('saantvana:reflections');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const saveReflections = (nextList) => {
    setReflections(nextList);
    try { localStorage.setItem('saantvana:reflections', JSON.stringify(nextList)); } catch {}
  };

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Your space is ready', desc: 'Saantvana is running privately in your browser with Google Meet & 3D Depth support.', time: 'Just now', unread: true },
    { id: 2, title: 'Connection reminder', desc: 'A quick hello or shared presence can mean a lot.', time: '1 hour ago', unread: true },
    { id: 3, title: 'Mindful pause', desc: 'Take a 60-second breathing pause when you need one.', time: 'Today', unread: false }
  ]);

  const say = (text) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 3200);
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const handler = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const room = new URLSearchParams(window.location.search).get('room');
    if (room && /^[A-Z0-9]{6,16}$/i.test(room)) {
      window.setTimeout(() => setInviteRoom(room.toUpperCase()), 0);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Launch Saantvana Depth Call
  const startSaantvanaCall = (person, room = '', displayName = profile.name) => {
    const roomCode =
      room ||
      Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => n.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    setInviteRoom('');
    setCallChoiceTarget(null);
    setCall({ ...person, displayName: displayName || profile.name, room: roomCode, role: room ? 'guest' : 'host' });
  };

  // Launch Google Meet
  const startGoogleMeet = async (person) => {
    setCallChoiceTarget(null);
    let meetUrl = 'https://meet.google.com/new';
    if (person && person.meetLink) {
      const clean = person.meetLink.trim();
      meetUrl = clean.startsWith('http') ? clean : `https://meet.google.com/${clean}`;
    }

    // Open Google Meet in new tab
    window.open(meetUrl, '_blank', 'noopener,noreferrer');

    // Copy invitation text to clipboard
    try {
      const inviteMsg = person
        ? `Hi ${person.name}, let's meet on Google Meet: ${meetUrl}`
        : `Join my Google Meet call: ${meetUrl}`;
      await navigator.clipboard.writeText(inviteMsg);
      say(`Google Meet opened in a new tab! Invitation copied to clipboard.`);
    } catch {
      say(`Google Meet opened in a new tab!`);
    }

    // Set companion session in Saantvana
    setActiveMeetSession({
      person: person || { name: 'A connection' },
      meetUrl,
      startedAt: new Date()
    });
  };

  const addConnection = (contact) => {
    const next = [contact, ...connections];
    saveConnections(next);
    setShowConnectionForm(false);
    say(`${contact.name} added to your connections.`);
  };

  const updateConnection = (updated) => {
    const next = connections.map((c) => (c.id === updated.id ? updated : c));
    saveConnections(next);
    setEditingContact(null);
    say(`${updated.name} updated.`);
  };

  const removeConnection = (contact) => {
    const next = connections.filter((item) => item.id !== contact.id);
    saveConnections(next);
    say(`${contact.name} was removed.`);
  };

  const copyRoomInvite = async (person) => {
    const roomCode = Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    try {
      await navigator.clipboard.writeText(`Hi ${person.name}, let's connect for a presence call on Saantvana: ${url}`);
      say(`Direct invite link for ${person.name} copied to clipboard.`);
    } catch {
      say(`Could not copy automatically. Link: ${url}`);
    }
  };

  const go = (name) => {
    setPage(name);
    setMobileNav(false);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="app-shell" onClick={() => {
      if (showNotifications) setShowNotifications(false);
      if (showWorkspaceMenu) setShowWorkspaceMenu(false);
      if (showQuickActions) setShowQuickActions(false);
    }}>
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); go('Home'); }}>
          <span className="brand-mark"><MessageCircle size={20}/><i/></span>
          <span>saantvana</span>
        </a>

        {/* Workspace Dropdown */}
        <div
          className="workspace"
          role="button"
          tabIndex={0}
          aria-haspopup="true"
          onClick={(e) => { e.stopPropagation(); setShowWorkspaceMenu(!showWorkspaceMenu); }}
        >
          <div className="workspace-avatar">{profile.space ? profile.space[0].toUpperCase() : 'S'}</div>
          <div><b>Your space</b><small>{profile.space}</small></div>
          <ChevronDown size={16}/>
        </div>

        {showWorkspaceMenu && (
          <div className="popover-menu workspace-popover" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '6px 14px 8px', fontSize: '11px', fontWeight: 800, color: '#888' }}>SPACES</div>
            {['Personal wellbeing', 'Family & Close Friends', 'Support & Reflection'].map((sp) => (
              <button
                key={sp}
                className="popover-item"
                onClick={() => {
                  saveProfile({ ...profile, space: sp });
                  setShowWorkspaceMenu(false);
                  say(`Switched to "${sp}".`);
                }}
              >
                <Sparkles size={16}/>
                <span>{sp}</span>
                {profile.space === sp && <Check size={16} style={{ marginLeft: 'auto', color: '#6e56cf' }}/>}
              </button>
            ))}
          </div>
        )}

        <div className="nav-label">YOUR SPACE</div>
        <nav aria-label="Main navigation">
          <NavItem icon={<Home size={20}/>} label="Home" active={page === 'Home'} onClick={() => go('Home')}/>
          <NavItem icon={<Heart size={20}/>} label="Connections" active={page === 'Connections'} onClick={() => go('Connections')} badge={String(connections.length)}/>
          <NavItem icon={<Activity size={20}/>} label="Wellbeing" active={page === 'Wellbeing'} onClick={() => go('Wellbeing')}/>
        </nav>

        <div className="side-bottom">
          <div className="gentle-card">
            <span className="gentle-icon"><Sparkles size={18}/></span>
            <b>A gentle reminder</b>
            <p>Small moments of connection count, too.</p>
          </div>
          <NavItem icon={<CircleHelp size={19}/>} label="How Saantvana works" onClick={() => setShowGuide(true)}/>
          <NavItem icon={<Settings size={19}/>} label="Settings & Preferences" onClick={() => setShowSettings(true)}/>
          <NavItem icon={<LifeBuoy size={19}/>} label="Helplines & Support" onClick={() => setShowCrisis(true)}/>

          {/* User Profile */}
          <div
            className="profile"
            role="button"
            tabIndex={0}
            onClick={() => setShowSettings(true)}
            title="Click to edit profile"
          >
            <div className={`avatar avatar-${profile.color || 'lilac'}`}>
              {profile.name ? profile.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : 'AM'}
            </div>
            <div>
              <b>{profile.name}</b>
              <small>{profile.space}</small>
            </div>
            <Edit3 size={16} style={{ color: '#aaa' }}/>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}>
            <Menu size={22}/>
          </button>
          <div className="crumb">Your space <span>/</span> <b>{page}</b></div>
          <div className="top-actions">
            {/* Quick Google Meet Launcher */}
            <button
              className="google-meet-btn"
              onClick={() => startGoogleMeet()}
              title="Launch instant Google Meet call in a new tab"
            >
              <GoogleMeetLogo size={18}/>
              <span>Google Meet</span>
            </button>

            {/* Dark Mode Quick Toggle */}
            <button
              className="icon-button"
              aria-label={profile.theme === 'dark' ? 'Switch to daylight theme' : 'Switch to calm night theme'}
              title={profile.theme === 'dark' ? 'Daylight theme' : 'Calm night theme'}
              onClick={() => saveProfile({ ...profile, theme: profile.theme === 'dark' ? 'light' : 'dark' })}
            >
              {profile.theme === 'dark' ? <Sun size={18} style={{ color: '#f59e0b' }}/> : <Moon size={18}/>}
            </button>

            <span className="private-label"><ShieldCheck size={16}/> Private by design</span>

            {/* Notification Center */}
            <div style={{ position: 'relative' }}>
              <button
                className="icon-button notification"
                aria-label="Notifications"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                  setNotifications(notifications.map((n) => ({ ...n, unread: false })));
                }}
              >
                <Bell size={19}/>
                {unreadCount > 0 && <i/>}
              </button>

              {showNotifications && (
                <div className="popover-menu notifications-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="notifications-header">
                    <b>Notifications</b>
                    <button onClick={() => { setNotifications([]); say('Notifications cleared.'); }}>Clear all</button>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: '13px', color: '#888' }}>
                      You’re all caught up.
                    </div>
                  ) : (
                    <div className="notification-list">
                      {notifications.map((n) => (
                        <div className="notification-card" key={n.id}>
                          <div className="notification-dot"/>
                          <div>
                            <b>{n.title}</b>
                            <p>{n.desc}</p>
                            <time>{n.time}</time>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className={`avatar avatar-${profile.color || 'lilac'} small-avatar`}
              onClick={() => setShowSettings(true)}
              style={{ cursor: 'pointer' }}
              title="Profile settings"
            >
              {profile.name ? profile.name[0].toUpperCase() : 'A'}
            </div>
          </div>
        </header>

        <div className="page-wrap">
          {/* Active Google Meet Companion Banner */}
          {activeMeetSession && (
            <div className="meet-companion-card">
              <GoogleMeetLogo size={24}/>
              <div style={{ flex: 1 }}>
                <b>Google Meet in progress with {activeMeetSession.person.name}</b>
                <p>Enjoy your conversation in your open Meet tab. When your call ends, take a quiet pause to ground yourself.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="outline-button"
                  style={{ background: '#fff' }}
                  onClick={() => { go('Wellbeing'); setActiveMeetSession(null); }}
                >
                  <Activity size={15}/> Mindful pause
                </button>
                <button
                  className="icon-button"
                  aria-label="Dismiss Meet banner"
                  onClick={() => setActiveMeetSession(null)}
                >
                  <X size={16}/>
                </button>
              </div>
            </div>
          )}

          {inviteRoom && (
            <div className="invite-banner">
              <div>
                <b>You’ve been invited to a Saantvana presence call</b>
                <span>Room {inviteRoom} · camera and microphone are requested only when you join.</span>
              </div>
              <label className="invite-name-label">
                Your name
                <input
                  className="invite-name"
                  maxLength={48}
                  placeholder={profile.name}
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                />
              </label>
              <button
                className="primary-button"
                onClick={() => {
                  const name = inviteName.trim() || profile.name;
                  startSaantvanaCall(
                    {
                      name,
                      initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
                      color: profile.color || 'lilac'
                    },
                    inviteRoom,
                    name
                  );
                }}
              >
                Join call <ArrowRight size={16}/>
              </button>
              <button
                className="icon-button"
                aria-label="Dismiss invitation"
                onClick={() => {
                  setInviteRoom('');
                  history.replaceState({}, '', location.pathname);
                }}
              >
                <X size={16}/>
              </button>
            </div>
          )}

          {page === 'Home' && (
            <HomePage
              profile={profile}
              onInitiateCall={(person) => setCallChoiceTarget(person || connections[0])}
              onStartGoogleMeet={() => startGoogleMeet()}
              go={go}
              say={say}
              people={connections}
              onRemove={removeConnection}
              onAdd={() => setShowConnectionForm(true)}
              onOpenGuide={() => setShowGuide(true)}
              onPromptSelect={(prompt) => {
                setActivePromptText(prompt);
                go('Wellbeing');
              }}
              showQuickActions={showQuickActions}
              setShowQuickActions={setShowQuickActions}
            />
          )}

          {page === 'Connections' && (
            <ConnectionsPage
              group={selectedGroup}
              setGroup={setSelectedGroup}
              people={connections}
              onInitiateCall={(person) => setCallChoiceTarget(person)}
              onStartGoogleMeet={(person) => startGoogleMeet(person)}
              say={say}
              onAdd={() => setShowConnectionForm(true)}
              onEdit={(c) => setEditingContact(c)}
              onRemove={removeConnection}
              onShare={copyRoomInvite}
            />
          )}

          {page === 'Wellbeing' && (
            <WellbeingPage
              say={say}
              initialPrompt={activePromptText}
              reflections={reflections}
              saveReflections={saveReflections}
              onOpenCrisis={() => setShowCrisis(true)}
            />
          )}

          <footer className="app-footer">
            <div className="footer-content">
              <p>© 2026 <b>Hareram Kushwaha</b>. All rights reserved.</p>
              <div className="footer-links">
                <button type="button" onClick={() => setShowGuide(true)}>How it works</button>
                <span className="dot">•</span>
                <button type="button" onClick={() => setShowCrisis(true)}>Crisis Support</button>
                <span className="dot">•</span>
                <a href="https://github.com/ha-re-ram/Saantvana" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
                <span className="dot">•</span>
                <a href="mailto:hareramkushwaha054@gmail.com">Contact</a>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}

      {/* Choose Call Type Modal: Saantvana Presence vs Google Meet */}
      {callChoiceTarget && (
        <CallChoiceModal
          person={callChoiceTarget}
          profile={profile}
          onClose={() => setCallChoiceTarget(null)}
          onSelectSaantvana={() => startSaantvanaCall(callChoiceTarget)}
          onSelectGoogleMeet={() => startGoogleMeet(callChoiceTarget)}
        />
      )}

      {/* Add Connection Modal */}
      {showConnectionForm && (
        <ConnectionFormModal
          onClose={() => setShowConnectionForm(false)}
          onSave={addConnection}
        />
      )}

      {/* Edit Connection Modal */}
      {editingContact && (
        <EditConnectionModal
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSave={updateConnection}
          onDelete={(c) => { removeConnection(c); setEditingContact(null); }}
        />
      )}

      {/* Settings & Preferences Modal */}
      {showSettings && (
        <SettingsModal
          profile={profile}
          onSave={(p) => { saveProfile(p); setShowSettings(false); say('Preferences saved.'); }}
          onClose={() => setShowSettings(false)}
          connectionCount={connections.length}
          reflectionCount={reflections.length}
          onExportData={() => {
            const data = { profile, connections, reflections, exportedAt: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `saantvana-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            say('Backup exported.');
          }}
          onClearAll={() => {
            if (window.confirm('Clear all locally saved connections and reflections? This cannot be undone.')) {
              localStorage.clear();
              setConnections(defaultContacts);
              setReflections([]);
              setShowSettings(false);
              say('All local data cleared.');
            }
          }}
        />
      )}

      {/* How Saantvana Works Modal */}
      {showGuide && (
        <HowItWorksModal onClose={() => setShowGuide(false)}/>
      )}

      {/* Confidential Crisis & Helplines Modal */}
      {showCrisis && (
        <CrisisModal onClose={() => setShowCrisis(false)}/>
      )}

      {/* Saantvana WebRTC 1:1 Video Call Modal with On-Device Depth */}
      {call && (
        <CallModal
          person={call}
          profile={profile}
          onClose={() => {
            setCall(null);
            say('Call ended. Take a moment before your next thing.');
          }}
          onSwitchToGoogleMeet={() => {
            const target = call;
            setCall(null);
            startGoogleMeet(target);
          }}
          onOpenSettings={() => {
            setCall(null);
            setShowSettings(true);
          }}
        />
      )}

      {notice && (
        <div className="toast" role="status">
          <Check size={18}/>
          {notice}
        </div>
      )}

      {installPrompt && (
        <button
          className="install-pill"
          onClick={async () => {
            await installPrompt.prompt();
            setInstallPrompt(null);
          }}
        >
          <Plus size={18}/> Install app
        </button>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
        <button
          className={`mobile-tab-btn ${page === 'Home' ? 'active' : ''}`}
          onClick={() => go('Home')}
        >
          <Home size={20}/>
          <span>Home</span>
        </button>
        <button
          className={`mobile-tab-btn ${page === 'Connections' ? 'active' : ''}`}
          onClick={() => go('Connections')}
        >
          <Heart size={20}/>
          <span>Connections</span>
          {connections.length > 0 && <span className="mobile-badge">{connections.length}</span>}
        </button>
        <button
          className={`mobile-tab-btn ${page === 'Wellbeing' ? 'active' : ''}`}
          onClick={() => go('Wellbeing')}
        >
          <Activity size={20}/>
          <span>Wellbeing</span>
        </button>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {badge && <em>{badge}</em>}
    </button>
  );
}

// Call Choice Modal: Allows seamlessly choosing between Saantvana Presence and Google Meet
function CallChoiceModal({ person, profile, onClose, onSelectSaantvana, onSelectGoogleMeet }) {
  const isStaticHost = typeof window !== 'undefined' && (
    window.location.hostname.endsWith('github.io') ||
    window.location.hostname.endsWith('pages.dev')
  );
  const hasCustomSignal = Boolean(profile?.signalUrl?.trim() || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SIGNAL_URL));

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="form-modal" style={{ width: 'min(520px, 100%)' }} role="dialog" aria-modal="true" aria-labelledby="call-choice-title">
        <div className="call-top">
          <div>
            <span className="call-status">CONNECT WITH {person.name.toUpperCase()}</span>
            <h2 id="call-choice-title">Choose how you'd like to call</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20}/>
          </button>
        </div>

        <p className="form-intro">
          Connect with <b>{person.name}</b> in a calm private presence space, or jump straight into Google Meet.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Saantvana Option */}
          <div
            onClick={onSelectSaantvana}
            style={{
              padding: '18px 20px',
              borderRadius: 16,
              border: '2px solid var(--purple)',
              background: 'var(--purple-light)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              transition: 'all 0.18s ease'
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--purple)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <Waves size={24}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 15, color: 'var(--ink)' }}>Saantvana Presence Call</b>
                <span style={{ fontSize: 11, background: '#ede9fe', color: 'var(--purple)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                  WebRTC P2P · Depth View
                </span>
              </div>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-secondary)', marginTop: 4 }}>
                Private 1:1 connection · On-device depth ambience · Zero cloud recording
              </span>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--purple)' }}/>
          </div>

          {/* Google Meet Option */}
          <div
            onClick={onSelectGoogleMeet}
            style={{
              padding: '18px 20px',
              borderRadius: 16,
              border: '2px solid #d3e2d6',
              background: '#f8fdf9',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              transition: 'all 0.18s ease'
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: '1px solid #c7e0cd', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <GoogleMeetLogo size={26}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 15, color: '#137333' }}>Google Meet</b>
                <span style={{ fontSize: 11, background: '#e6f4ea', color: '#137333', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                  Instant · Companion Mode
                </span>
              </div>
              <span style={{ display: 'block', fontSize: 13, color: '#274e2d', marginTop: 4 }}>
                {person.meetLink ? 'Open your saved Google Meet room' : 'Instant Google Meet in a new tab with auto-invite'}
              </span>
            </div>
            <ExternalLink size={18} style={{ color: '#137333' }}/>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button className="outline-button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

// Interactive Home Page with Real Carousel, Live Actions, & Google Meet
function HomePage({ profile, onInitiateCall, onStartGoogleMeet, go, say, people, onRemove, onAdd, onOpenGuide, onPromptSelect, showQuickActions, setShowQuickActions }) {
  const [checkIn, setCheckIn] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);

  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
    .format(new Date())
    .toUpperCase();

  const currentPrompt = connectionPrompts[promptIndex];
  const firstName = profile.name.split(' ')[0] || 'there';

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="sun-dot"/> {dateLabel}</div>
          <h1>Good evening, {firstName} <span className="wave">✦</span></h1>
          <p className="subhead">A little space to check in, and feel a little closer.</p>
        </div>

        {/* Quick Action Button & Menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="round-more"
            aria-label="More options"
            onClick={(e) => { e.stopPropagation(); setShowQuickActions(!showQuickActions); }}
          >
            <MoreHorizontal size={22}/>
          </button>

          {showQuickActions && (
            <div className="popover-menu" style={{ right: 0, top: 48 }} onClick={(e) => e.stopPropagation()}>
              <button className="popover-item" onClick={() => { setShowQuickActions(false); onInitiateCall(people[0]); }}>
                <Video size={17}/> Create presence call
              </button>
              <button className="popover-item" onClick={() => { setShowQuickActions(false); onStartGoogleMeet(); }}>
                <GoogleMeetLogo size={17}/> Instant Google Meet
              </button>
              <button className="popover-item" onClick={() => { setShowQuickActions(false); onAdd(); }}>
                <Plus size={17}/> Add connection
              </button>
              <button className="popover-item" onClick={() => { setShowQuickActions(false); go('Wellbeing'); }}>
                <Activity size={17}/> Mindful breathing pause
              </button>
              <button className="popover-item" onClick={() => {
                setShowQuickActions(false);
                const roomCode = Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
                navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${roomCode}`);
                say('Instant room link copied to clipboard.');
              }}>
                <Share2 size={17}/> Copy instant room link
              </button>
              <button className="popover-item" onClick={() => { setShowQuickActions(false); onOpenGuide(); }}>
                <CircleHelp size={17}/> How Saantvana works
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Alive Hero Card with Dual Call Launchers */}
      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="live-dot"/> YOUR CONNECTION MOMENT</div>
          <h2>Presence is a gift<br/>you can share.</h2>
          <p>Make a little room for someone you care about. Choose an immersive depth call or jump into Google Meet.</p>

          <div className="hero-actions">
            <button
              className="google-meet-btn primary-meet"
              onClick={() => onStartGoogleMeet(people[0])}
            >
              <GoogleMeetLogo size={18}/>
              <span>Start Google Meet</span>
            </button>
            <button className="outline-button hero-presence-btn" onClick={() => onInitiateCall(people[0])}>
              <Waves size={16}/> Saantvana Presence
            </button>
          </div>

          <div className="hero-caption">
            <ShieldCheck size={16}/> Direct Google Meet enabled · Private 1:1 presence & depth available
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one"/>
          <div className="orbit orbit-two"/>
          <div className="sun-glow"/>
          <div className="person person-one"><span className="head"/><span className="body"/></div>
          <div className="person person-two"><span className="head"/><span className="body"/></div>
          <div className="spark spark-a">✧</div>
          <div className="spark spark-b">·</div>
          <div className="art-caption"><span className="art-dot"/> together, even from here</div>
        </div>
      </section>

      {/* Connections Quick Access */}
      <div className="section-heading">
        <div>
          <div className="eyebrow">YOUR PEOPLE</div>
          <h3>Keep the connection going</h3>
          <div className="sample-note">Trusted people stored only on this browser. Connect via Google Meet or private link.</div>
        </div>
        <button className="text-button" onClick={() => go('Connections')}>
          All connections ({people.length}) <ArrowRight size={16}/>
        </button>
      </div>

      <div className="people-grid">
        {people.slice(0, 3).map((p) => (
          <PersonCard
            key={p.id || p.name}
            person={p}
            onInitiateCall={onInitiateCall}
            onStartGoogleMeet={onStartGoogleMeet}
            say={say}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Lower Grid: Real Check-in & Interactive Prompt Carousel */}
      <div className="lower-grid">
        <section className="checkin-card">
          <div className="checkin-icon"><Waves size={22}/></div>
          <div className="checkin-text">
            <div className="eyebrow">A MOMENT FOR YOU</div>
            <h3>
              {checkIn === 'Low-key' && '☁ Low-key: Moving gently today.'}
              {checkIn === 'Okay' && '◡ Okay: Steady, present, and here.'}
              {checkIn === 'Bright' && '✳ Bright: Carrying a little warmth.'}
              {checkIn === 'Tender' && '♡ Tender: Giving yourself extra care.'}
              {checkIn === 'Grounded' && '✦ Grounded: Centered and breathing easy.'}
              {!checkIn && 'How are you arriving today?'}
            </h3>
            <p>
              {checkIn
                ? 'Thanks for taking a moment to notice. There is nothing you need to fix.'
                : 'There’s no right answer. Just notice what’s here.'}
            </p>
            <div className="mood-row">
              {[
                ['Low-key', '☁'],
                ['Okay', '◡'],
                ['Bright', '✳'],
                ['Tender', '♡'],
                ['Grounded', '✦']
              ].map(([m, e]) => (
                <button
                  className={checkIn === m ? 'chosen' : ''}
                  key={m}
                  aria-pressed={checkIn === m}
                  onClick={() => setCheckIn(checkIn === m ? '' : m)}
                >
                  <span>{e}</span>{m}
                </button>
              ))}
            </div>
            <small className="privacy-note">
              <ShieldCheck size={14}/> This check-in stays on this page and is never tracked.
            </small>
          </div>
        </section>

        {/* Carousel Prompt Card */}
        <section className="prompt-card">
          <div className="prompt-top">
            <div className="eyebrow">A SMALL PROMPT</div>
            <div className="carousel-nav">
              <button
                aria-label="Previous prompt"
                onClick={() => setPromptIndex((i) => (i - 1 + connectionPrompts.length) % connectionPrompts.length)}
              >
                <ChevronLeft size={16}/>
              </button>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink-secondary)' }}>
                0{promptIndex + 1} / 0{connectionPrompts.length}
              </span>
              <button
                aria-label="Next prompt"
                onClick={() => setPromptIndex((i) => (i + 1) % connectionPrompts.length)}
              >
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>

          <div className="prompt-quote">“{currentPrompt.quote}”</div>
          <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: '8px 0 12px', position: 'relative', zIndex: 1 }}>
            {currentPrompt.hint}
          </p>

          <button
            className="prompt-link"
            onClick={() => onPromptSelect(currentPrompt.quote)}
          >
            Take a quiet moment <ArrowRight size={16}/>
          </button>

          <div className="carousel-dots">
            {connectionPrompts.map((p, idx) => (
              <span key={p.id} className={`carousel-dot ${idx === promptIndex ? 'active' : ''}`}/>
            ))}
          </div>

          <div className="prompt-orb"/>
        </section>
      </div>

      <footer className="disclaimer">
        <ShieldCheck size={16}/> Saantvana is a calm connection concept. It is not a clinical service or a substitute for professional mental health care.
      </footer>
    </>
  );
}

function PersonCard({ person, onInitiateCall, onStartGoogleMeet, say, onRemove }) {
  return (
    <article className="person-card">
      <div className={`avatar avatar-${person.color || 'peach'}`}>{person.initials}</div>
      <div className="person-info">
        <b>{person.name}</b>
        <span>{person.relation}</span>
        <small><i className="local-dot"/>{person.group} · {person.time || 'Local contact'}</small>
      </div>
      <div className="person-card-actions">
        <button
          className="meet-card-btn"
          aria-label={`Start Google Meet with ${person.name}`}
          onClick={() => onStartGoogleMeet?.(person)}
          title="Start Google Meet"
        >
          <GoogleMeetLogo size={16}/>
          <span className="meet-card-text">Meet</span>
        </button>
        <button
          className="presence-card-btn"
          aria-label={`Start presence call with ${person.name}`}
          onClick={() => onInitiateCall(person)}
          title="Saantvana Presence Call"
        >
          <Waves size={15}/>
        </button>
        <button
          className="person-more"
          aria-label={`Remove ${person.name}`}
          onClick={() => onRemove?.(person)}
          title="Remove connection"
        >
          <X size={15}/>
        </button>
      </div>
    </article>
  );
}

// Real Connections Page with Live Search, Filter, Google Meet, and Direct Sharing
function ConnectionsPage({ group, setGroup, people, onInitiateCall, onStartGoogleMeet, say, onAdd, onEdit, onRemove, onShare }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return people.filter((p) => {
      const matchesGroup = group === 'Everyone' || p.group === group;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term || p.name.toLowerCase().includes(term) || (p.relation && p.relation.toLowerCase().includes(term));
      return matchesGroup && matchesSearch;
    });
  }, [people, group, searchTerm]);

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">YOUR PEOPLE</div>
        <h1>Connections</h1>
        <p className="subhead">The people who help the world feel a little less far away.</p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="search-box">
        <Search size={18} className="search-icon"/>
        <input
          type="search"
          className="search-input"
          placeholder="Search by name or relationship (e.g. Maya, Brother)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="connection-toolbar">
        <div className="filters">
          {['Everyone', 'Friends', 'Family', 'Community'].map((item) => (
            <button key={item} className={group === item ? 'selected' : ''} onClick={() => setGroup(item)}>
              {item}
            </button>
          ))}
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={16}/> Add a connection
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '18px', padding: '48px 24px', textAlign: 'center' }}>
          <Heart size={36} style={{ color: 'var(--purple)', margin: '0 auto 14px', display: 'block' }}/>
          <b style={{ fontSize: '16px', color: 'var(--ink)' }}>No connections match your search</b>
          <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: '8px 0 20px' }}>Try adjusting your search terms or add someone new.</p>
          <button className="primary-button" onClick={onAdd}><Plus size={16}/> Add connection</button>
        </div>
      ) : (
        <div className="connection-list">
          {filtered.map((p) => (
            <div className="connection-row" key={p.id || p.name}>
              <div className="person-card" style={{ border: 0, padding: 0, flex: 1, boxShadow: 'none' }}>
                <div className={`avatar avatar-${p.color || 'peach'}`}>{p.initials}</div>
                <div className="person-info">
                  <b>{p.name}</b>
                  <span>{p.relation}</span>
                  <small><i className="local-dot"/>{p.group} · {p.time || 'Saved on this browser'}</small>
                </div>
              </div>

              <div className="last-contact">
                <small>PRIVATE TO THIS DEVICE</small>
                <span>{p.time || 'Local contact'}</span>
              </div>

              <div className="connection-actions">
                {/* Direct Google Meet Button (Default Primary) */}
                <button
                  className="google-meet-btn primary-meet"
                  onClick={() => onStartGoogleMeet(p)}
                  title={`Start Google Meet with ${p.name}`}
                >
                  <GoogleMeetLogo size={16}/>
                  <span>Start Meet</span>
                </button>

                <button
                  className="outline-button presence-action-btn"
                  onClick={() => onInitiateCall(p)}
                  title="Saantvana Presence Call (WebRTC & Depth)"
                >
                  <Waves size={15}/> Presence
                </button>

                <button
                  className="outline-button"
                  onClick={() => onShare(p)}
                  title="Copy direct invite link"
                >
                  <Share2 size={15}/>
                </button>

                <button
                  className="outline-button"
                  onClick={() => onEdit(p)}
                  title="Edit connection details"
                >
                  <Edit3 size={15}/>
                </button>

                <button
                  className="icon-button delete-conn-btn"
                  onClick={() => onRemove(p)}
                  title="Remove connection"
                >
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="connect-note">
        <div className="connect-note-icon"><Heart size={22}/></div>
        <div>
          <b>Connection can be small</b>
          <p>A quick hello, a shared silence, or simply knowing someone is there can all matter.</p>
        </div>
      </div>

      <footer className="disclaimer">
        <ShieldCheck size={16}/> Added names stay in this browser. Calls share a room link; nothing is synced to external servers.
      </footer>
    </>
  );
}

// Comprehensive Wellbeing Page with Configurable Pause, 5-4-3-2-1 Grounding, and Saved Reflections
function WellbeingPage({ say, initialPrompt, reflections, saveReflections, onOpenCrisis }) {
  const [breathingState, sendBreathing] = useMachine(breathingMachine);
  const [activeTab, setActiveTab] = useState('pause'); // 'pause' | 'grounding'
  const [reflectionText, setReflectionText] = useState(initialPrompt ? `“${initialPrompt}”\n` : '');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const view = getBreathingView(breathingState);

  // Breathing timer & gentle audio chime
  useEffect(() => {
    if (!view.isActive || view.seconds <= 0) return;
    const timer = window.setInterval(() => {
      sendBreathing({ type: BREATHING_EVENTS.TICK });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view.isActive, view.seconds, sendBreathing]);

  // Audio chime trigger on phase transitions
  useEffect(() => {
    if (!soundEnabled || !view.isActive) return;
    if (view.label === 'Breathe in gently') playGentleChime(432);
    else if (view.label === 'Rest softly') playGentleChime(528);
    else if (view.label === 'Breathe out slowly') playGentleChime(396);
  }, [view.label, view.isActive, soundEnabled]);

  const saveCurrentReflection = () => {
    const text = reflectionText.trim();
    if (!text) return;
    const item = {
      id: crypto.randomUUID(),
      text,
      date: new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    saveReflections([item, ...reflections]);
    say('Reflection saved in this browser.');
  };

  const deleteReflection = (id) => {
    saveReflections(reflections.filter((r) => r.id !== id));
    say('Reflection removed.');
  };

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">YOUR OWN PACE</div>
        <h1>Wellbeing</h1>
        <p className="subhead">Gentle ways to notice what you need, without needing to fix anything.</p>
      </div>

      {/* Tabs */}
      <div className="tab-row">
        <button
          className={`tab-btn ${activeTab === 'pause' ? 'active' : ''}`}
          onClick={() => setActiveTab('pause')}
        >
          Mindful Pause ({view.totalSeconds}s)
        </button>
        <button
          className={`tab-btn ${activeTab === 'grounding' ? 'active' : ''}`}
          onClick={() => setActiveTab('grounding')}
        >
          5-4-3-2-1 Sensory Grounding
        </button>
      </div>

      <div className="wellbeing-grid">
        {/* Tab Content */}
        {activeTab === 'pause' ? (
          <section className="wellbeing-feature">
            <div className="feature-illustration">
              <div
                className={`breath-circle ${view.isActive ? 'breathing' : ''}`}
                role="status"
                aria-live="polite"
              >
                <span>
                  {view.label}
                  <br/>
                  {view.isActive && `${view.seconds}s left`}
                </span>
              </div>
              <span className="feature-star">✧</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="eyebrow">A {view.totalSeconds}-SECOND PAUSE</div>
              <button
                className="icon-button"
                style={{ width: 32, height: 32 }}
                title={soundEnabled ? 'Mute chimes' : 'Enable chimes'}
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>}
              </button>
            </div>

            <h2>{view.headline}</h2>
            <p>Let your shoulders soften. Follow the pace only if it feels comfortable.</p>

            {/* Duration Selectors when idle */}
            {!view.isActive && view.seconds === view.totalSeconds && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[60, 120, 180].map((sec) => (
                  <button
                    key={sec}
                    className={`small-btn ${view.totalSeconds === sec ? 'primary-button' : ''}`}
                    onClick={() => sendBreathing({ type: BREATHING_EVENTS.SET_DURATION, duration: sec })}
                  >
                    {sec / 60} min
                  </button>
                ))}
              </div>
            )}

            <button
              className="primary-button"
              onClick={() => sendBreathing({ type: BREATHING_EVENTS.TOGGLE })}
            >
              {view.buttonLabel} <ArrowRight size={16}/>
            </button>
          </section>
        ) : (
          /* 5-4-3-2-1 Grounding Tool */
          <section className="wellbeing-feature" style={{ overflowY: 'auto' }}>
            <div className="eyebrow">GROUNDING MOMENT</div>
            <h2>5-4-3-2-1 Sensory Reset</h2>
            <p>Bring your attention to your immediate surroundings whenever thoughts feel loud.</p>

            <div className="grounding-box">
              <div className="grounding-step-card">
                <div className="grounding-num">5</div>
                <div><b>Look around</b><p>Notice 5 things you can see right now (shapes, light, colors).</p></div>
              </div>
              <div className="grounding-step-card">
                <div className="grounding-num">4</div>
                <div><b>Touch</b><p>Notice 4 things you can physically feel (feet on floor, fabric, chair).</p></div>
              </div>
              <div className="grounding-step-card">
                <div className="grounding-num">3</div>
                <div><b>Listen</b><p>Notice 3 subtle sounds (hum of a fan, distant traffic, your breath).</p></div>
              </div>
              <div className="grounding-step-card">
                <div className="grounding-num">2</div>
                <div><b>Scent & Breath</b><p>Notice 2 scents or take 2 slow, intentional breaths.</p></div>
              </div>
              <div className="grounding-step-card">
                <div className="grounding-num">1</div>
                <div><b>Appreciate</b><p>Notice 1 kind thing about yourself or this moment right here.</p></div>
              </div>
            </div>
          </section>
        )}

        {/* Private Reflections */}
        <section className="reflection-card">
          <div className="checkin-icon"><Heart size={22}/></div>
          <div className="eyebrow">PRIVATE REFLECTION</div>
          <h3>What kind of connection would feel good today?</h3>
          <p>You can keep the answer to yourself, or use it as a gentle nudge toward someone you trust.</p>

          <textarea
            aria-label="Private reflection"
            placeholder="A few words, only for you…"
            value={reflectionText}
            onChange={(event) => setReflectionText(event.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 10 }}>
            <small style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>
              {reflectionText.trim().split(/\s+/).filter(Boolean).length} words
            </small>

            <div className="btn-row" style={{ marginTop: 0 }}>
              {reflectionText.trim() && (
                <>
                  <button className="small-btn" onClick={() => { navigator.clipboard.writeText(reflectionText); say('Copied reflection.'); }}>
                    <Copy size={14}/> Copy
                  </button>
                  <button className="small-btn" onClick={() => setReflectionText('')}>
                    <X size={14}/> Clear
                  </button>
                </>
              )}
              <button className="primary-button" style={{ padding: '8px 14px', fontSize: '12px' }} onClick={saveCurrentReflection}>
                Save note
              </button>
            </div>
          </div>

          {/* Saved Reflections History */}
          {reflections.length > 0 && (
            <div style={{ width: '100%', marginTop: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>SAVED IN THIS BROWSER ({reflections.length})</div>
              <div className="journal-history" style={{ maxHeight: 150, overflowY: 'auto' }}>
                {reflections.slice(0, 5).map((r) => (
                  <div className="journal-item" key={r.id}>
                    <div>
                      <time>{r.date}</time>
                      <p>{r.text}</p>
                    </div>
                    <button
                      className="icon-button"
                      style={{ width: 26, height: 26, border: 0 }}
                      onClick={() => deleteReflection(r.id)}
                      title="Delete saved reflection"
                    >
                      <Trash2 size={14} style={{ color: '#b1aebb' }}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <small style={{ marginTop: 12 }}>
            <ShieldCheck size={14}/> Saved notes stay strictly in your device local storage.
          </small>
        </section>
      </div>

      {/* Support & Helplines Note */}
      <section className="support-note">
        <ShieldCheck size={20}/>
        <div style={{ flex: 1 }}>
          <b>You deserve support that fits your needs.</b>
          <p>Saantvana is a calm tool, not a clinical service. If you are going through a difficult time, free, confidential human support is available 24/7.</p>
        </div>
        <button className="outline-button" onClick={onOpenCrisis} style={{ whiteSpace: 'nowrap' }}>
          <LifeBuoy size={16}/> Helplines & Resources
        </button>
      </section>

      <div className="measure-note">
        <div className="measure-icon"><Activity size={20}/></div>
        <div>
          <b>A note on measuring wellbeing</b>
          <p>This app does not assess, score, or gamify loneliness. Any clinical evaluation requires qualified professional consultation and consent.</p>
        </div>
      </div>
    </>
  );
}

// 100% Real WebRTC Call Modal with Screen Share, In-Call Chat, Floating Reactions, and Depth View
function CallModal({ person, profile, onClose, onSwitchToGoogleMeet, onOpenSettings }) {
  const [callState, sendCall] = useMachine(callMachine, () => ({
    ...initialCallContext,
    person,
    role: person.role || (person.room ? 'guest' : 'host'),
    peerName: person.name || 'Your connection'
  }));

  const [depthState, sendDepth] = useMachine(depthMachine, initialDepthContext);

  // In-call additions
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const depthCanvas = useRef(null);
  const depthEstimator = useRef(null);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const callContainerRef = useRef(null);
  const roleRef = useRef(person.role || (person.room ? 'guest' : 'host'));

  const roomUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(person.room)}`;
  const { context: callCtx } = callState;
  const { context: depthCtx } = depthState;

  // In-call timer
  useEffect(() => {
    if (callState.value !== 'CONNECTED') return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [callState.value]);

  const formatCallTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // WebRTC & WebSocket signaling session lifecycle
  useEffect(() => {
    let disposed = false;
    const pendingIce = [];

    sendCall({ type: CALL_EVENTS.START, person });

    const connect = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera and microphone access requires a secure connection (HTTPS or localhost).');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        sendCall({ type: CALL_EVENTS.LOCAL_STREAM_ACQUIRED, stream });

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const isStaticHost = typeof window !== 'undefined' && (
          window.location.hostname.endsWith('github.io') ||
          window.location.hostname.endsWith('pages.dev')
        );
        const defaultSignalUrl = isStaticHost
          ? 'wss://saantvana.onrender.com/signal'
          : `${protocol}//${location.host}/signal`;
        const signalUrl = (profile?.signalUrl && profile.signalUrl.trim()) ||
                          (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SIGNAL_URL) ||
                          defaultSignalUrl;
        const socket = new WebSocket(signalUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          socket.send(JSON.stringify({
            type: 'join',
            room: person.room,
            name: (person.displayName || profile.name).slice(0, 48)
          }));
        };

        socket.onerror = () => {
          sendCall({
            type: CALL_EVENTS.SOCKET_ERROR,
            message: 'Could not reach Saantvana’s signaling service. Connect via Google Meet or verify the signaling server.'
          });
        };

        socket.onclose = () => {
          if (!disposed && !callCtx.error) {
            sendCall({ type: CALL_EVENTS.SOCKET_CLOSED });
          }
        };

        socket.onmessage = async (event) => {
          let message;
          try {
            message = JSON.parse(event.data);
          } catch {
            return;
          }

          if (message.type === 'error') {
            sendCall({ type: CALL_EVENTS.SOCKET_ERROR, message: message.message });
            return;
          }

          if (message.type === 'joined') {
            roleRef.current = message.role;
            sendCall({
              type: CALL_EVENTS.SOCKET_JOINED,
              role: message.role,
              peerName: message.peerName
            });
            return;
          }

          if (message.type === 'waiting') {
            sendCall({ type: CALL_EVENTS.SOCKET_WAITING });
            return;
          }

          if (message.type === 'peer-joined') {
            sendCall({ type: CALL_EVENTS.PEER_JOINED, name: message.name });
            if (roleRef.current === 'host') {
              const pc = makePeerConnection();
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.send(JSON.stringify({ type: 'offer', description: pc.localDescription }));
            }
            return;
          }

          if (message.type === 'offer') {
            sendCall({ type: CALL_EVENTS.OFFER_RECEIVED });
            const pc = makePeerConnection();
            await pc.setRemoteDescription(message.description);
            for (const candidate of pendingIce.splice(0)) {
              await pc.addIceCandidate(candidate).catch(() => {});
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: 'answer', description: pc.localDescription }));
            return;
          }

          if (message.type === 'answer' && pcRef.current) {
            sendCall({ type: CALL_EVENTS.ANSWER_RECEIVED });
            await pcRef.current.setRemoteDescription(message.description);
            for (const candidate of pendingIce.splice(0)) {
              await pcRef.current.addIceCandidate(candidate).catch(() => {});
            }
            return;
          }

          if (message.type === 'ice' && message.candidate) {
            if (pcRef.current && pcRef.current.remoteDescription) {
              try {
                await pcRef.current.addIceCandidate(message.candidate);
              } catch {}
            } else {
              pendingIce.push(message.candidate);
            }
            return;
          }

          if (message.type === 'peer-left') {
            pcRef.current?.close();
            pcRef.current = null;
            pendingIce.length = 0;
            sendCall({ type: CALL_EVENTS.PEER_LEFT });
            sendDepth({ type: DEPTH_EVENTS.STREAM_DISCONNECTED });
            return;
          }

          if (message.type === 'depth-request') {
            sendDepth({ type: DEPTH_EVENTS.PEER_REQUEST_RECEIVED, name: message.name });
            return;
          }

          if (message.type === 'depth-response') {
            sendDepth({
              type: DEPTH_EVENTS.PEER_CONSENT_RESPONSE,
              allowed: message.allowed,
              revoked: message.revoked
            });
            return;
          }

          // Live In-Call Messaging
          if (message.type === 'chat' && message.text) {
            setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: 'theirs', text: message.text }]);
          }

          // Live In-Call Floating Reactions
          if (message.type === 'reaction' && message.emoji) {
            triggerFloatingReaction(message.emoji);
          }
        };
      } catch (cause) {
        if (!disposed) {
          sendCall({
            type: CALL_EVENTS.MEDIA_ERROR,
            error:
              cause.name === 'NotAllowedError'
                ? 'Camera or microphone permission was denied. Allow access in your browser settings and try again.'
                : cause.message || 'Could not start camera and microphone.'
          });
        }
      }
    };

    const makePeerConnection = () => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;

      streamRef.current?.getTracks().forEach((track) => pc.addTrack(track, streamRef.current));

      pc.ontrack = (event) => {
        sendCall({ type: CALL_EVENTS.REMOTE_TRACK_RECEIVED, stream: event.streams[0] });
        sendDepth({ type: DEPTH_EVENTS.STREAM_CONNECTED });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          sendCall({ type: CALL_EVENTS.CONNECTION_CONNECTED });
        } else if (pc.connectionState === 'failed') {
          sendCall({
            type: CALL_EVENTS.CONNECTION_FAILED,
            message: 'Could not connect. This network may need a TURN relay.'
          });
        }
      };

      return pc;
    };

    connect();

    return () => {
      disposed = true;
      pcRef.current?.close();
      socketRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      pcRef.current = null;
      socketRef.current = null;
      streamRef.current = null;
      sendCall({ type: CALL_EVENTS.END_CALL });
      sendDepth({ type: DEPTH_EVENTS.RESET });
    };
  }, []);

  // Sync video elements with streams
  useEffect(() => {
    if (localVideo.current && callCtx.localStream) {
      localVideo.current.srcObject = callCtx.localStream;
    }
  }, [callCtx.localStream]);

  useEffect(() => {
    if (remoteVideo.current && callCtx.remoteStream) {
      remoteVideo.current.srcObject = callCtx.remoteStream;
    }
  }, [callCtx.remoteStream]);

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);

      if (streamRef.current && pcRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
        if (localVideo.current) localVideo.current.srcObject = streamRef.current;
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const screenTrack = screenStream.getVideoTracks()[0];
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }
        if (localVideo.current) localVideo.current.srcObject = screenStream;

        screenTrack.onended = () => {
          toggleScreenShare();
        };
      } catch {}
    }
  };

  // In-Call Chat Sending
  const sendChatMessage = (e) => {
    e.preventDefault();
    const clean = chatInput.trim();
    if (!clean) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'chat', text: clean }));
    }
    setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: 'mine', text: clean }]);
    setChatInput('');
  };

  // Floating Reactions
  const triggerFloatingReaction = (emoji) => {
    const id = crypto.randomUUID();
    const x = Math.floor(Math.random() * 60) + 20;
    setFloatingReactions((prev) => [...prev, { id, emoji, x }]);
    window.setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2200);
  };

  const sendReaction = (emoji) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'reaction', emoji }));
    }
    triggerFloatingReaction(emoji);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      callContainerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // On-device depth inference pipeline
  const isDepthActive = depthCtx.viewerState === VIEWER_STATES.ACTIVE;
  const isDepthApprovedOrActive =
    depthCtx.viewerState === VIEWER_STATES.APPROVED ||
    depthCtx.viewerState === VIEWER_STATES.LOADING_MODEL ||
    depthCtx.viewerState === VIEWER_STATES.ACTIVE;

  useEffect(() => {
    if (!isDepthApprovedOrActive || !callCtx.remoteStream || !remoteVideo.current || !depthCanvas.current) {
      return;
    }

    let stopped = false;
    let timer;

    const processDepth = async () => {
      try {
        if (!depthEstimator.current) {
          sendDepth({ type: DEPTH_EVENTS.MODEL_LOAD_START });
          const { pipeline } = await import('@huggingface/transformers');
          depthEstimator.current = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf', {
            dtype: 'q4',
            device: navigator.gpu ? 'webgpu' : 'wasm',
            revision: '2e942621ab9f2371c1df9eb223291b5ac31475e6',
          });
          if (stopped) return;
          sendDepth({ type: DEPTH_EVENTS.MODEL_LOAD_SUCCESS });
        }

        const video = remoteVideo.current;
        if (stopped || !video || video.readyState < 2) return;

        const input = document.createElement('canvas');
        input.width = 320;
        input.height = 180;
        input.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, input.width, input.height);

        const result = await depthEstimator.current(input);
        if (stopped || !depthCanvas.current) return;

        const map = result.depth;
        const w = map.width;
        const h = map.height;
        const canvas = depthCanvas.current;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(input, 0, 0, w, h);

        const frame = ctx.getImageData(0, 0, w, h);
        const values = map.data;
        const ordered = Array.from(values).sort((a, b) => a - b);
        const threshold = ordered[Math.floor(ordered.length * 0.62)] ?? 128;

        for (let i = 0; i < values.length; i++) {
          const alpha = Math.max(0, Math.min(220, 110 + (values[i] - threshold) * 5));
          frame.data[i * 4 + 3] = alpha;
        }

        ctx.putImageData(frame, 0, 0);
      } catch {
        if (!stopped) {
          sendDepth({ type: DEPTH_EVENTS.MODEL_LOAD_ERROR });
        }
      } finally {
        if (!stopped && depthCtx.viewerState === VIEWER_STATES.ACTIVE) {
          timer = window.setTimeout(processDepth, 900);
        }
      }
    };

    processDepth();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [isDepthApprovedOrActive, depthCtx.viewerState, callCtx.remoteStream, sendDepth]);

  const toggleTrack = (kind) => {
    const track = streamRef.current?.getTracks().find((item) => item.kind === kind);
    if (!track) return;
    track.enabled = !track.enabled;
    sendCall({ type: CALL_EVENTS.TOGGLE_TRACK, kind });
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      sendCall({ type: CALL_EVENTS.SET_COPIED, copied: true });
      window.setTimeout(() => sendCall({ type: CALL_EVENTS.SET_COPIED, copied: false }), 2200);
    } catch {
      sendCall({
        type: CALL_EVENTS.SOCKET_ERROR,
        message: 'Copy was unavailable. Share the room link from your browser address bar.'
      });
    }
  };

  const requestDepth = () => {
    if (depthCtx.viewerState === VIEWER_STATES.ACTIVE || depthCtx.viewerState === VIEWER_STATES.PAUSED) {
      sendDepth({ type: DEPTH_EVENTS.TOGGLE_DEPTH });
      return;
    }
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: 'depth-request', name: (person.displayName || profile.name).slice(0, 48) }));
    sendDepth({ type: DEPTH_EVENTS.REQUEST_DEPTH });
  };

  const answerDepthRequest = (allowed) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'depth-response', allowed }));
    }
    sendDepth({ type: DEPTH_EVENTS.RESPOND_TO_CONSENT, allow: allowed });
  };

  const revokeDepth = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'depth-response', allowed: false, revoked: true }));
    }
    sendDepth({ type: DEPTH_EVENTS.REVOKE_CONSENT });
  };

  const isDepthBusy = depthCtx.viewerState === VIEWER_STATES.LOADING_MODEL;
  const isDepthPending = depthCtx.viewerState === VIEWER_STATES.REQUESTING;

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={callContainerRef}
        className="call-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-title"
      >
        <div className="call-top">
          <div>
            <span className="call-status">
              <i className="live-dot"/> PRIVATE CALL · ROOM {person.room}
            </span>
            <h2 id="call-title">A moment with {callCtx.peerName.split(' ')[0]}</h2>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="icon-button"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              onClick={toggleFullscreen}
              title="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
            </button>
            <button className="icon-button" aria-label="Close call" onClick={onClose}>
              <X size={20}/>
            </button>
          </div>
        </div>

        {/* Video Stage */}
        <div className={`live-call-stage ${isDepthActive ? 'depth-enabled' : ''}`}>
          {/* Call Duration Badge */}
          {callState.value === 'CONNECTED' && (
            <div className="call-timer-badge">
              <i/> {formatCallTime(elapsedSeconds)}
            </div>
          )}

          {/* Floating Reaction Bubbles */}
          {floatingReactions.map((r) => (
            <span
              key={r.id}
              className="floating-reaction"
              style={{ left: `${r.x}%` }}
            >
              {r.emoji}
            </span>
          ))}

          {/* Remote Video Tile */}
          <div className="video-tile remote-tile">
            {callCtx.remoteStream ? (
              <>
                <video ref={remoteVideo} autoPlay playsInline/>
                <canvas className="depth-canvas" ref={depthCanvas} aria-hidden="true"/>
              </>
            ) : (
              <div className="waiting-state">
                {callCtx.error ? (
                  <div className="signaling-fallback-box">
                    <span className="fallback-badge">STATIC HOSTING NOTICE</span>
                    <b style={{ fontSize: '16px', display: 'block', marginTop: 4 }}>Signaling Service Unreachable</b>
                    <p style={{ maxWidth: 360, fontSize: 13, color: '#e0def4', lineHeight: 1.5, margin: '8px auto 16px' }}>
                      Static hosting serves files without a background WebSocket server. Connect directly with Google Meet or connect through Render.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                      {onSwitchToGoogleMeet && (
                        <button
                          type="button"
                          className="primary-button"
                          style={{ background: '#137333', borderColor: '#137333', gap: 8, padding: '10px 18px', width: '100%', justifyContent: 'center' }}
                          onClick={onSwitchToGoogleMeet}
                        >
                          <GoogleMeetLogo size={18}/> Connect via Google Meet (Instant)
                        </button>
                      )}
                      {onOpenSettings && (
                        <button
                          type="button"
                          className="outline-button"
                          style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', fontSize: 12, padding: '8px 14px', width: '100%', justifyContent: 'center' }}
                          onClick={onOpenSettings}
                        >
                          <Settings size={14}/> Configure Signaling Server URL
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="stage-orb"/>
                    <div className={`stage-avatar avatar-${person.color || 'peach'}`}>{person.initials}</div>
                    <b>{person.role === 'host' ? 'Your person will appear here' : 'Waiting for the host to connect'}</b>
                    <span>{callCtx.status}</span>
                  </>
                )}
              </div>
            )}
            <label>{callCtx.remoteStream ? callCtx.peerName : 'Waiting'}</label>
          </div>

          {/* Local Video Tile */}
          <div className="video-tile local-tile">
            {callCtx.localStream ? (
              <video ref={localVideo} autoPlay playsInline muted/>
            ) : (
              <div className="video-placeholder">Camera preview</div>
            )}
            <label>{isScreenSharing ? 'Your screen' : 'You'}</label>
          </div>

          {/* In-Call Live Chat Drawer */}
          {showChat && (
            <div className="call-chat-drawer">
              <div className="chat-header">
                <span>In-Call Chat</span>
                <button
                  className="icon-button"
                  style={{ width: 24, height: 24, border: 0 }}
                  onClick={() => setShowChat(false)}
                >
                  <X size={16}/>
                </button>
              </div>

              <div className="chat-messages">
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: '11px', marginTop: 24 }}>
                    Messages are private between you two and disappear when the call ends.
                  </div>
                ) : (
                  chatMessages.map((m) => (
                    <div key={m.id} className={`chat-msg ${m.sender}`}>
                      {m.text}
                    </div>
                  ))
                )}
              </div>

              {/* Gentle Reaction Emoji Bar */}
              <div className="reaction-bar">
                {['❤️', '✨', '👋', '🌸', '☕'].map((emoji) => (
                  <button
                    key={emoji}
                    className="reaction-btn"
                    onClick={() => sendReaction(emoji)}
                    title={`Send ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form className="chat-input-row" onSubmit={sendChatMessage}>
                <input
                  placeholder="Send a quiet note…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="primary-button" style={{ padding: '8px 12px' }}>
                  <Send size={14}/>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Consent Prompt Dialog for Receiver */}
        {depthCtx.consentState === CONSENT_STATES.PROMPTED && (
          <div className="depth-consent" role="dialog" aria-label="Depth processing permission">
            <div>
              <b>{depthCtx.promptRequesterName} is asking to use depth view</b>
              <span>This will estimate a depth layer on their device. Video frames are never sent to AI cloud services.</span>
            </div>
            <button className="outline-button" onClick={() => answerDepthRequest(false)}>Decline</button>
            <button className="primary-button" onClick={() => answerDepthRequest(true)}>Allow</button>
          </div>
        )}

        {/* Revocable Grant Banner */}
        {depthCtx.consentState === CONSENT_STATES.GRANTED && (
          <div className="depth-grant">
            <span>You’re allowing on-device depth processing of your video.</span>
            <button onClick={revokeDepth}>Revoke access</button>
          </div>
        )}

        {/* Live Status Bar */}
        <div className="live-status" role="status" aria-live="polite">
          {callCtx.error ? (
            <><span className="error-dot"/>{callCtx.error}</>
          ) : (
            <><span className="live-dot" style={{ width: 7, height: 7 }}/>{depthCtx.note || callCtx.status}</>
          )}
        </div>

        {/* Invite Link Sharing Bar */}
        <div className="invite-strip">
          <div>
            <b>Invite someone into this room</b>
            <span>Anyone with this link can join. Share only with someone you trust.</span>
          </div>
          <button className="outline-button" onClick={copyInvite}>
            <Plus size={16}/>{callCtx.copied ? 'Copied invite' : 'Copy invite link'}
          </button>
        </div>

        {/* Call Controls */}
        <div className="call-controls">
          <button
            className={!callCtx.micEnabled ? 'control-off' : ''}
            onClick={() => toggleTrack('audio')}
            aria-label={callCtx.micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            <span>{callCtx.micEnabled ? <Mic size={20}/> : <MicOff size={20}/>}</span>
            {callCtx.micEnabled ? 'Mic on' : 'Mic off'}
          </button>

          <button
            className={!callCtx.cameraEnabled ? 'control-off' : ''}
            onClick={() => toggleTrack('video')}
            aria-label={callCtx.cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            <span>{callCtx.cameraEnabled ? <Video size={20}/> : <VideoOff size={20}/>}</span>
            {callCtx.cameraEnabled ? 'Camera on' : 'Camera off'}
          </button>

          <button
            className={isScreenSharing ? 'control-active' : ''}
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Stop screen sharing' : 'Share your screen'}
          >
            <span>{isScreenSharing ? <MonitorOff size={20}/> : <Monitor size={20}/>}</span>
            {isScreenSharing ? 'Sharing' : 'Share screen'}
          </button>

          <button
            className={showChat ? 'control-active' : ''}
            onClick={() => setShowChat(!showChat)}
            title="In-call chat"
          >
            <span><MessageCircle size={20}/></span>
            Chat
          </button>

          <button
            className={isDepthActive ? 'control-active' : ''}
            disabled={!callCtx.remoteStream || isDepthPending || isDepthBusy}
            onClick={requestDepth}
            title="The other person must approve. Runs locally using on-device AI."
          >
            <span><Waves size={20}/></span>
            {isDepthBusy
              ? 'Loading…'
              : isDepthPending
              ? 'Awaiting approval'
              : isDepthActive
              ? 'Depth on'
              : depthCtx.viewerState === VIEWER_STATES.PAUSED
              ? 'Depth view'
              : 'Request depth'}
          </button>

          <button className="end-call" onClick={onClose}>
            <span><Phone size={20}/></span>
            End call
          </button>
        </div>

        <div className="call-footnote">
          Your audio and video are sent directly between devices when possible. Saantvana does not record or store your call.
        </div>
      </section>
    </div>
  );
}

// Add Connection Modal with optional Google Meet link
function ConnectionFormModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Friends');
  const [relation, setRelation] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [color, setColor] = useState('peach');

  const colors = [
    { id: 'peach', hex: '#fae8df', label: 'Peach' },
    { id: 'blue', hex: '#e0eef7', label: 'Blue' },
    { id: 'green', hex: '#e1f2e7', label: 'Green' },
    { id: 'lilac', hex: '#e9e3f6', label: 'Lilac' }
  ];

  const submit = (event) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const initials = clean.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    onSave({
      id: crypto.randomUUID(),
      name: clean,
      group,
      relation: relation.trim() || (group === 'Community' ? 'Community connection' : group === 'Family' ? 'Family member' : 'Friend'),
      meetLink: meetLink.trim(),
      initials,
      color,
      time: 'Added today',
      saved: true
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <div className="call-top">
          <div>
            <span className="call-status">YOUR CONNECTIONS</span>
            <h2 id="contact-title">Add someone you trust</h2>
          </div>
          <button className="icon-button" aria-label="Close form" onClick={onClose}>
            <X size={20}/>
          </button>
        </div>
        <p className="form-intro">Their name stays in this browser only. You can share a private call link or Google Meet anytime.</p>
        <form onSubmit={submit}>
          <label htmlFor="contact-name">Name</label>
          <input
            id="contact-name"
            autoFocus
            maxLength={48}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Jamie Miller"
          />

          <label htmlFor="contact-relation">Relationship / Note</label>
          <input
            id="contact-relation"
            maxLength={48}
            value={relation}
            onChange={(event) => setRelation(event.target.value)}
            placeholder="e.g. Childhood friend, Mentor, Sister"
          />

          <label htmlFor="contact-meet">Google Meet code or link (optional)</label>
          <input
            id="contact-meet"
            maxLength={120}
            value={meetLink}
            onChange={(event) => setMeetLink(event.target.value)}
            placeholder="e.g. meet.google.com/abc-defg-hij"
          />

          <label htmlFor="contact-group">Connection group</label>
          <select id="contact-group" value={group} onChange={(event) => setGroup(event.target.value)}>
            <option>Friends</option>
            <option>Family</option>
            <option>Community</option>
          </select>

          <label>Avatar color</label>
          <div className="color-picker-row">
            {colors.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`color-swatch ${color === c.id ? 'selected' : ''}`}
                style={{ background: c.hex }}
                onClick={() => setColor(c.id)}
                title={c.label}
              />
            ))}
          </div>

          <div className="local-storage-note">
            <ShieldCheck size={16}/> Saved locally on this device only. No automatic email or SMS is sent.
          </div>

          <div className="form-actions">
            <button type="button" className="outline-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button">Save connection <ArrowRight size={16}/></button>
          </div>
        </form>
      </section>
    </div>
  );
}

// Edit Connection Modal
function EditConnectionModal({ contact, onClose, onSave, onDelete }) {
  const [name, setName] = useState(contact.name);
  const [group, setGroup] = useState(contact.group || 'Friends');
  const [relation, setRelation] = useState(contact.relation || '');
  const [meetLink, setMeetLink] = useState(contact.meetLink || '');
  const [color, setColor] = useState(contact.color || 'peach');

  const colors = [
    { id: 'peach', hex: '#fae8df', label: 'Peach' },
    { id: 'blue', hex: '#e0eef7', label: 'Blue' },
    { id: 'green', hex: '#e1f2e7', label: 'Green' },
    { id: 'lilac', hex: '#e9e3f6', label: 'Lilac' }
  ];

  const submit = (event) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const initials = clean.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    onSave({
      ...contact,
      name: clean,
      group,
      relation: relation.trim() || 'Connection',
      meetLink: meetLink.trim(),
      initials,
      color
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="edit-contact-title">
        <div className="call-top">
          <div>
            <span className="call-status">EDIT CONTACT</span>
            <h2 id="edit-contact-title">Edit {contact.name}</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={submit}>
          <label htmlFor="edit-name">Name</label>
          <input
            id="edit-name"
            maxLength={48}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <label htmlFor="edit-relation">Relationship</label>
          <input
            id="edit-relation"
            maxLength={48}
            value={relation}
            onChange={(event) => setRelation(event.target.value)}
          />

          <label htmlFor="edit-meet">Google Meet code or link</label>
          <input
            id="edit-meet"
            maxLength={120}
            value={meetLink}
            onChange={(event) => setMeetLink(event.target.value)}
            placeholder="e.g. meet.google.com/abc-defg-hij"
          />

          <label htmlFor="edit-group">Connection group</label>
          <select id="edit-group" value={group} onChange={(event) => setGroup(event.target.value)}>
            <option>Friends</option>
            <option>Family</option>
            <option>Community</option>
          </select>

          <label>Avatar color</label>
          <div className="color-picker-row">
            {colors.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`color-swatch ${color === c.id ? 'selected' : ''}`}
                style={{ background: c.hex }}
                onClick={() => setColor(c.id)}
              />
            ))}
          </div>

          <div className="form-actions" style={{ justifyContent: 'space-between', marginTop: 18 }}>
            <button
              type="button"
              className="outline-button"
              style={{ color: '#e11d48', borderColor: '#fecdd3' }}
              onClick={() => {
                if (window.confirm(`Remove ${contact.name} from your saved connections?`)) {
                  onDelete(contact);
                }
              }}
            >
              <Trash2 size={15}/> Delete
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="outline-button" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-button">Save changes</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

// Settings & Preferences Modal with Theme & Defaults
function SettingsModal({ profile, onSave, onClose, connectionCount, reflectionCount, onExportData, onClearAll }) {
  const [name, setName] = useState(profile.name);
  const [space, setSpace] = useState(profile.space);
  const [color, setColor] = useState(profile.color || 'lilac');
  const [theme, setTheme] = useState(profile.theme || 'light');
  const [defaultMic, setDefaultMic] = useState(profile.defaultMic ?? true);
  const [defaultCam, setDefaultCam] = useState(profile.defaultCam ?? true);
  const [signalUrl, setSignalUrl] = useState(profile.signalUrl || '');

  const colors = [
    { id: 'lilac', hex: '#e9e3f6', label: 'Lilac' },
    { id: 'peach', hex: '#fae8df', label: 'Peach' },
    { id: 'blue', hex: '#e0eef7', label: 'Blue' },
    { id: 'green', hex: '#e1f2e7', label: 'Green' }
  ];

  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...profile,
      name: name.trim() || 'Alex Morgan',
      space: space.trim() || 'Personal wellbeing',
      color,
      theme,
      defaultMic,
      defaultCam,
      signalUrl: signalUrl.trim()
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="call-top">
          <div>
            <span className="call-status">PREFERENCES</span>
            <h2 id="settings-title">Profile & Privacy Settings</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={submit} className="settings-grid">
          <div className="settings-item">
            <label htmlFor="prof-name">Your Display Name</label>
            <input
              id="prof-name"
              maxLength={48}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <small>Used when joining presence calls and greeting you in your space.</small>
          </div>

          <div className="settings-item">
            <label htmlFor="prof-space">Space Subtitle</label>
            <input
              id="prof-space"
              maxLength={48}
              value={space}
              onChange={(e) => setSpace(e.target.value)}
            />
          </div>

          <div className="settings-item">
            <label>Interface Theme</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className={`small-btn ${theme === 'light' ? 'primary-button' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={15}/> Warm Daylight
              </button>
              <button
                type="button"
                className={`small-btn ${theme === 'dark' ? 'primary-button' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={15}/> Calm Night
              </button>
            </div>
          </div>

          <div className="settings-item">
            <label>Avatar Color</label>
            <div className="color-picker-row">
              {colors.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`color-swatch ${color === c.id ? 'selected' : ''}`}
                  style={{ background: c.hex }}
                  onClick={() => setColor(c.id)}
                />
              ))}
            </div>
          </div>

          <div className="settings-item">
            <label>Call Defaults</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '13px', fontWeight: 'normal', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={defaultMic}
                  onChange={(e) => setDefaultMic(e.target.checked)}
                />
                Start calls with microphone on
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '13px', fontWeight: 'normal', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={defaultCam}
                  onChange={(e) => setDefaultCam(e.target.checked)}
                />
                Start calls with camera on
              </label>
            </div>
          </div>

          <div className="settings-item">
            <label htmlFor="prof-signal">WebRTC Signaling Server URL (Optional)</label>
            <input
              id="prof-signal"
              placeholder="wss://your-signaling-app.onrender.com/signal"
              value={signalUrl}
              onChange={(e) => setSignalUrl(e.target.value)}
            />
            <small>
              Static hosts (GitHub Pages) require a WebSocket backend for native calls. Leave empty to use Google Meet or local default.
            </small>
          </div>

          <div className="settings-item">
            <label>Data & Browser Storage</label>
            <small>
              Currently storing <b>{connectionCount} connections</b> and <b>{reflectionCount} reflections</b> privately on this browser.
            </small>
            <div className="btn-row">
              <button type="button" className="small-btn" onClick={onExportData}>
                <Copy size={14}/> Export backup (JSON)
              </button>
              <button
                type="button"
                className="small-btn"
                style={{ color: '#e11d48', borderColor: '#fecdd3' }}
                onClick={onClearAll}
              >
                <Trash2 size={14}/> Clear all local data
              </button>
            </div>
          </div>

          <div className="settings-item" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <label>Author & License</label>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: '4px 0' }}>
              Saantvana v1.0.0 · Designed & built by <b>Hareram Kushwaha</b> (<a href="https://github.com/ha-re-ram" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple)', textDecoration: 'underline' }}>@ha-re-ram</a>).
            </p>
            <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: 0 }}>
              MIT Licensed · Watermark-free, privacy-first on-device software.
            </p>
          </div>

          <div className="form-actions" style={{ marginTop: 14 }}>
            <button type="button" className="outline-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button">Save preferences</button>
          </div>
        </form>
      </section>
    </div>
  );
}

// "How Saantvana Works" Guide Modal
function HowItWorksModal({ onClose }) {
  const [guideTab, setGuideTab] = useState('calls');

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <div className="call-top">
          <div>
            <span className="call-status">EXPLAINER</span>
            <h2 id="guide-title">How Saantvana Works</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20}/>
          </button>
        </div>

        <div className="tab-row">
          <button className={`tab-btn ${guideTab === 'calls' ? 'active' : ''}`} onClick={() => setGuideTab('calls')}>
            Private Calling & Meet
          </button>
          <button className={`tab-btn ${guideTab === 'depth' ? 'active' : ''}`} onClick={() => setGuideTab('depth')}>
            On-Device Depth View
          </button>
          <button className={`tab-btn ${guideTab === 'privacy' ? 'active' : ''}`} onClick={() => setGuideTab('privacy')}>
            Privacy Principles
          </button>
          <button className={`tab-btn ${guideTab === 'about' ? 'active' : ''}`} onClick={() => setGuideTab('about')}>
            Author & Project
          </button>
        </div>

        {guideTab === 'calls' && (
          <div className="guide-section">
            <span className="guide-badge"><Video size={15}/> WebRTC P2P & Google Meet</span>
            <h3>Connect How You Feel Comfortable</h3>
            <p>Saantvana gives you two ways to connect with people you care about:</p>
            <p><b>1. Saantvana Presence Calls:</b> One-to-one direct peer-to-peer WebRTC calls. Media streams travel directly between devices with zero cloud recording, ephemeral room links, in-call chat, and reactions.</p>
            <p><b>2. Google Meet:</b> Launch an instant Google Meet room or connect to a saved room link in one click. Saantvana copies your invitation message and stays open as a calm post-call companion.</p>
          </div>
        )}

        {guideTab === 'depth' && (
          <div className="guide-section">
            <span className="guide-badge"><Waves size={15}/> On-Device AI</span>
            <h3>Depth Estimation & Two-Party Consent</h3>
            <p>Saantvana provides an optional subtle depth-layer effect to make conversations feel more visually present.</p>
            <p><b>Video sender consent is mandatory:</b> You cannot view depth until the person whose video is being processed clicks "Allow". They can click "Revoke" at any second to stop processing immediately.</p>
            <p><b>Zero Cloud Video Uploads:</b> The depth model (a quantized ~27 MB model from Hugging Face) downloads to the viewing browser and runs locally using Transformers.js and WebGPU/WASM. No video frames are ever sent to an AI cloud provider.</p>
          </div>
        )}

        {guideTab === 'privacy' && (
          <div className="guide-section">
            <span className="guide-badge"><ShieldCheck size={15}/> Privacy By Default</span>
            <h3>Client-Side Storage Only</h3>
            <p>Your connections, personal check-ins, and reflections are saved only in your device’s browser storage (localStorage). There are no user accounts, passwords, or cloud databases tracking your activity.</p>
            <p>Saantvana does not score or gamify mental health. We believe in calm, dignified human connection without streaks or pressure.</p>
          </div>
        )}

        {guideTab === 'about' && (
          <div className="guide-section">
            <span className="guide-badge"><ShieldCheck size={15}/> Created with Care</span>
            <h3>About Saantvana</h3>
            <p><b>Author & Maintainer:</b> Hareram Kushwaha (<a href="https://github.com/ha-re-ram" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple)', textDecoration: 'underline' }}>@ha-re-ram</a>)</p>
            <p><b>Contact Email:</b> <a href="mailto:hareramkushwaha054@gmail.com" style={{ color: 'var(--purple)', textDecoration: 'underline' }}>hareramkushwaha054@gmail.com</a></p>
            <p><b>GitHub Repository:</b> <a href="https://github.com/ha-re-ram/Saantvana" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple)', textDecoration: 'underline' }}>github.com/ha-re-ram/Saantvana</a></p>
            <p style={{ marginTop: 10 }}>Saantvana was conceived and engineered to foster genuine, unpressured emotional presence between people who already care about each other. It operates under strict two-party consent with no cloud video telemetry and zero algorithmic gamification.</p>
          </div>
        )}

        <div className="form-actions">
          <button className="primary-button" onClick={onClose}>Understood <ArrowRight size={16}/></button>
        </div>
      </section>
    </div>
  );
}

// Confidential Crisis & Support Resources Modal
function CrisisModal({ onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="crisis-modal" role="dialog" aria-modal="true" aria-labelledby="crisis-title">
        <div className="call-top">
          <div>
            <span className="call-status" style={{ color: '#e11d48' }}>CONFIDENTIAL SUPPORT</span>
            <h2 id="crisis-title">Find Human & Crisis Support</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20}/>
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
          If you are feeling overwhelmed, hopeless, or just need to speak with a trained person right now, free and confidential support is available 24 hours a day, 7 days a week.
        </p>

        {/* United States & Canada */}
        <div className="crisis-resource-card">
          <b>988 Suicide & Crisis Lifeline <span style={{ fontSize: '11px', color: 'var(--purple)' }}>US & Canada</span></b>
          <p>Free, confidential support for anyone in suicidal crisis or emotional distress. Call or text 988.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="tel:988" className="crisis-contact-action"><Phone size={14}/> Call 988</a>
            <a href="sms:988" className="crisis-contact-action" style={{ background: '#593ec2' }}>Text 988</a>
          </div>
        </div>

        {/* Crisis Text Line */}
        <div className="crisis-resource-card">
          <b>Crisis Text Line <span style={{ fontSize: '11px', color: 'var(--purple)' }}>US, UK, Canada</span></b>
          <p>Connect with a crisis counselor 24/7 over free SMS text.</p>
          <a href="sms:741741?&body=HOME" className="crisis-contact-action"><MessageCircle size={14}/> Text HOME to 741741</a>
        </div>

        {/* United Kingdom */}
        <div className="crisis-resource-card">
          <b>Samaritans & NHS 111 <span style={{ fontSize: '11px', color: 'var(--purple)' }}>United Kingdom</span></b>
          <p>Call 116 123 for Samaritans (free 24/7) or call 111 for mental health crisis support.</p>
          <a href="tel:116123" className="crisis-contact-action"><Phone size={14}/> Call 116 123</a>
        </div>

        {/* India */}
        <div className="crisis-resource-card">
          <b>Tele-MANAS & Vandrevala Foundation <span style={{ fontSize: '11px', color: 'var(--purple)' }}>India</span></b>
          <p>National Tele Mental Health Programme toll-free helpline 14416 / 1800-891-4416; Vandrevala Foundation +91 9999 666 555.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="tel:14416" className="crisis-contact-action"><Phone size={14}/> Call 14416</a>
            <a href="tel:+919999666555" className="crisis-contact-action" style={{ background: '#593ec2' }}><Phone size={14}/> Call Vandrevala</a>
          </div>
        </div>

        {/* International */}
        <div className="crisis-resource-card">
          <b>Befrienders Worldwide <span style={{ fontSize: '11px', color: 'var(--purple)' }}>Global Directory</span></b>
          <p>Find free, confidential emotional support helplines in over 30 countries worldwide.</p>
          <a href="https://www.befrienders.org" target="_blank" rel="noopener noreferrer" className="crisis-contact-action">
            <ExternalLink size={14}/> Visit befrienders.org
          </a>
        </div>

        <div className="form-actions" style={{ marginTop: 18 }}>
          <button className="primary-button" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
