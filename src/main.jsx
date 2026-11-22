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
  groundingMachine,
  GROUNDING_STATES,
  GROUNDING_EVENTS,
  getGroundingView
} from './machines/groundingMachine.js';
import {
  modalMachine,
  MODAL_STATES,
  MODAL_EVENTS
} from './machines/modalMachine.js';
import {
  menuMachine,
  MENU_STATES,
  MENU_EVENTS
} from './machines/menuMachine.js';
import {
  companionMachine,
  COMPANION_STATES,
  COMPANION_EVENTS,
  getCompanionView
} from './machines/companionMachine.js';

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

// Universally compatible unique ID generator (safe across non-secure webviews & mobile browsers)
function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

const defaultContacts = [];

const connectionPrompts = [
  { id: 1, quote: 'Who’s someone you feel a little more yourself around?', hint: 'Think of someone who accepts you just as you are.' },
  { id: 2, quote: 'What is a small memory with someone that brings a quiet smile?', hint: 'A shared joke, an unexpected laugh, or a quiet walk.' },
  { id: 3, quote: 'If you could share five minutes of calm silence with anyone, who would it be?', hint: 'Someone whose presence alone feels grounding.' }
];

function App() {
  const [page, setPage] = useState('Home');
  const [selectedGroup, setSelectedGroup] = useState('Everyone');
  const [notice, setNotice] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  // Modal Orchestration State Machine (UX/DX/AX: Single focused overlay, zero collisions)
  const [modalState, sendModal] = useMachine(modalMachine);
  const showSettings = modalState.matches(MODAL_STATES.SETTINGS);
  const showGuide = modalState.matches(MODAL_STATES.GUIDE);
  const showCrisis = modalState.matches(MODAL_STATES.CRISIS);
  const showConnectionForm = modalState.matches(MODAL_STATES.ADD_CONNECTION);
  const editingContact = modalState.matches(MODAL_STATES.EDIT_CONNECTION) ? modalState.context.targetPerson : null;

  const closeModal = () => sendModal({ type: MODAL_EVENTS.CLOSE });
  const openSettings = () => sendModal({ type: MODAL_EVENTS.OPEN_SETTINGS });
  const openGuide = () => sendModal({ type: MODAL_EVENTS.OPEN_GUIDE });
  const openCrisis = () => sendModal({ type: MODAL_EVENTS.OPEN_CRISIS });
  const openAddConnection = () => sendModal({ type: MODAL_EVENTS.OPEN_ADD_CONNECTION });
  const openEditConnection = (contact) => sendModal({ type: MODAL_EVENTS.OPEN_EDIT_CONNECTION, contact });

  const [wellbeingTab, setWellbeingTab] = useState('pause');

  // Popovers & Menus State Machine (UX/DX/AX: Mutually exclusive, zero overlapping popovers)
  const [menuState, sendMenu] = useMachine(menuMachine);
  const showNotifications = menuState.matches(MENU_STATES.NOTIFICATIONS);
  const showWorkspaceMenu = menuState.matches(MENU_STATES.WORKSPACE);
  const showQuickActions = menuState.matches(MENU_STATES.QUICK_ACTIONS);

  const closeMenu = () => sendMenu({ type: MENU_EVENTS.CLOSE });
  const toggleNotifications = () => sendMenu({ type: MENU_EVENTS.TOGGLE_NOTIFICATIONS });
  const toggleWorkspaceMenu = () => sendMenu({ type: MENU_EVENTS.TOGGLE_WORKSPACE });
  const toggleQuickActions = () => sendMenu({ type: MENU_EVENTS.TOGGLE_QUICK_ACTIONS });

  const [activePromptText, setActivePromptText] = useState('');

  // Google Meet Companion Session State Machine (UX/DX/AX: Deterministic session lifecycle & decompression)
  const [companionState, sendCompanion] = useMachine(companionMachine);
  const companionView = getCompanionView(companionState);

  useEffect(() => {
    if (!companionView.isActive) return;
    const interval = window.setInterval(() => {
      sendCompanion({ type: COMPANION_EVENTS.TICK });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [companionView.isActive, sendCompanion]);

  // Persistent User Profile
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('saantvana:profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name === 'Alex Morgan') parsed.name = '';
        return parsed;
      }
    } catch {}
    return { name: '', space: 'My space', color: 'lilac', theme: 'light', defaultMeetLink: '' };
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

  // Persistent Connections (Clean production state with no mock dummy data)
  const [connections, setConnections] = useState(() => {
    try {
      const saved = localStorage.getItem('saantvana:connections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => !['contact-1', 'contact-2', 'contact-3'].includes(c.id));
        }
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
    { id: 1, title: 'Your space is ready', desc: 'Saantvana is running privately in your browser with Google Meet calling.', time: 'Just now', unread: true },
    { id: 2, title: 'Connection reminder', desc: 'A quick hello or shared presence can mean a lot.', time: '1 hour ago', unread: true },
    { id: 3, title: 'Mindful pause', desc: 'Take a 60-second breathing pause when you need one.', time: 'Today', unread: false }
  ]);

  const noticeTimerRef = useRef(null);
  const say = (text) => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setNotice(text);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice('');
      noticeTimerRef.current = null;
    }, 3200);
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
    if (room) {
      say('Saantvana now connects directly via Google Meet for full reliability on all networks.');
      history.replaceState({}, '', location.pathname);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Launch Google Meet
  const startGoogleMeet = async (person, customMeetUrl) => {
    closeModal();
    let meetUrl = 'https://meet.google.com/new';
    if (customMeetUrl && customMeetUrl.trim()) {
      const clean = customMeetUrl.trim();
      meetUrl = clean.startsWith('http') ? clean : `https://meet.google.com/${clean}`;
    } else if (person && person.meetLink && person.meetLink.trim()) {
      const clean = person.meetLink.trim();
      meetUrl = clean.startsWith('http') ? clean : `https://meet.google.com/${clean}`;
    } else if (profile?.defaultMeetLink && profile.defaultMeetLink.trim()) {
      const clean = profile.defaultMeetLink.trim();
      meetUrl = clean.startsWith('http') ? clean : `https://meet.google.com/${clean}`;
    }

    // Open Google Meet in new tab
    window.open(meetUrl, '_blank', 'noopener,noreferrer');

    // Copy invitation text to clipboard
    try {
      const targetName = person && person.name && person.name !== 'A connection' ? person.name : '';
      const inviteMsg = targetName
        ? `Hi ${targetName}, let's meet on Google Meet: ${meetUrl}`
        : `Join my Google Meet call: ${meetUrl}`;
      await navigator.clipboard.writeText(inviteMsg);
      say(`Google Meet opened in a new tab! Invitation copied to clipboard.`);
    } catch {
      say(`Google Meet opened in a new tab!`);
    }

    // Set companion session in Saantvana (deterministic FSM)
    sendCompanion({
      type: COMPANION_EVENTS.START,
      person: person || { name: 'A connection' },
      meetUrl
    });
  };

  const addConnection = (contact) => {
    const next = [contact, ...connections];
    saveConnections(next);
    closeModal();
    say(`${contact.name} added to your connections.`);
  };

  const updateConnection = (updated) => {
    const next = connections.map((c) => (c.id === updated.id ? updated : c));
    saveConnections(next);
    closeModal();
    say(`${updated.name} updated.`);
  };

  const removeConnection = (contact) => {
    const next = connections.filter((item) => item.id !== contact.id);
    saveConnections(next);
    say(`${contact.name} was removed.`);
  };

  const go = (name, targetTab = 'pause') => {
    setPage(name);
    if (name === 'Wellbeing') {
      setWellbeingTab(targetTab);
    }
    setMobileNav(false);
    closeMenu();
  };

  // Global Escape Key Listener for Modals and Popovers
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!menuState.matches(MENU_STATES.CLOSED)) {
          closeMenu();
        } else if (!modalState.matches(MODAL_STATES.IDLE)) {
          closeModal();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuState.value, modalState.value]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="app-shell" onClick={closeMenu}>
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
          onClick={(e) => { e.stopPropagation(); toggleWorkspaceMenu(); }}
        >
          <div className="workspace-avatar">{profile.space ? profile.space[0].toUpperCase() : 'S'}</div>
          <div><b>Your space</b><small>{profile.space}</small></div>
          <ChevronDown size={16}/>
        </div>

        {showWorkspaceMenu && (
          <div className="popover-menu workspace-popover" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '6px 14px 8px', fontSize: '11px', fontWeight: 800, color: 'var(--ink-muted)' }}>SPACES</div>
            {['Personal wellbeing', 'Family & Close Friends', 'Support & Reflection'].map((sp) => (
              <button
                key={sp}
                className="popover-item"
                onClick={() => {
                  saveProfile({ ...profile, space: sp });
                  closeMenu();
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
          <NavItem icon={<CircleHelp size={19}/>} label="How Saantvana works" onClick={openGuide}/>
          <NavItem icon={<Settings size={19}/>} label="Settings & Preferences" onClick={openSettings}/>
          <NavItem icon={<LifeBuoy size={19}/>} label="Helplines & Support" onClick={openCrisis}/>

          {/* User Profile */}
          <div
            className="profile"
            role="button"
            tabIndex={0}
            onClick={openSettings}
            title="Click to edit profile"
          >
            <div className={`avatar avatar-${profile.color || 'lilac'}`}>
              {profile.name ? profile.name.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : <User size={16}/>}
            </div>
            <div>
              <b>{profile.name || 'Your Space'}</b>
              <small>{profile.name ? profile.space : 'Click to set name'}</small>
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
          <div className="crumb">
            <span className="crumb-root">Your space</span>
            <span className="crumb-slash">/</span>
            <b>{page}</b>
          </div>
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
                  toggleNotifications();
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
                    <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: '13px', color: 'var(--ink-muted)' }}>
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
              onClick={openSettings}
              style={{ cursor: 'pointer' }}
              title="Profile settings"
            >
              {profile.name ? profile.name[0].toUpperCase() : <User size={14}/>}
            </div>
          </div>
        </header>

        <div className="page-wrap">
          {/* Active Google Meet Companion Banner */}
          {companionView.isActive && (
            <div className="meet-companion-card" role="region" aria-label="Active Google Meet session">
              <div className="companion-left">
                <GoogleMeetLogo size={28}/>
                <div>
                  <div className="companion-title-row">
                    <b>Google Meet in progress with {companionView.personName}</b>
                    <span className="companion-timer"><span className="live-dot"/> {companionView.formattedElapsed}</span>
                  </div>
                  <p>Connected via Google Meet in your open tab. Saantvana stays right here as your quiet companion.</p>
                </div>
              </div>
              <div className="companion-actions">
                <button
                  className="outline-button small-btn"
                  onClick={() => window.open(companionView.meetUrl, '_blank')}
                  title="Re-open or switch to your Meet tab"
                >
                  <ExternalLink size={14}/> Open Meet tab
                </button>
                <button
                  className="outline-button small-btn"
                  onClick={async () => {
                    const targetName = companionView.personName && companionView.personName !== 'A connection'
                      ? companionView.personName
                      : '';
                    const inviteMsg = targetName
                      ? `Hi ${targetName}, let's meet on Google Meet: ${companionView.meetUrl}`
                      : `Join my Google Meet call: ${companionView.meetUrl}`;
                    try {
                      await navigator.clipboard.writeText(inviteMsg);
                      say('Google Meet invitation copied to clipboard.');
                    } catch {
                      say(`Link: ${companionView.meetUrl}`);
                    }
                  }}
                  title="Copy Google Meet invite message to clipboard"
                >
                  <Copy size={14}/> Copy invite
                </button>
                <button
                  className="outline-button small-btn"
                  onClick={() => go('Wellbeing', 'pause')}
                  title="Take a 1-minute calming breath"
                >
                  <Activity size={14}/> Mindful pause
                </button>
                <button
                  className="outline-button small-btn"
                  onClick={() => go('Wellbeing', 'grounding')}
                  title="5-4-3-2-1 Sensory Grounding"
                >
                  <ShieldCheck size={14}/> Grounding
                </button>
                <button
                  className="primary-button small-btn end-session-btn"
                  onClick={() => {
                    sendCompanion({ type: COMPANION_EVENTS.FINISH });
                    say('Call ended. Take a gentle breath before your next activity.');
                  }}
                  title="Finish and dismiss Meet session"
                >
                  Finish call
                </button>
              </div>
            </div>
          )}

          {/* Post-Call Somatic Decompression Card */}
          {companionView.isPostCall && (
            <div className="post-call-card" role="region" aria-label="Post-call decompression">
              <div className="companion-left">
                <Sparkles size={26} style={{ color: 'var(--purple)', flexShrink: 0 }}/>
                <div>
                  <b>Call with {companionView.personName} concluded ({companionView.formattedElapsed})</b>
                  <p>Take a quiet breath or jot down a note before moving into your next moment.</p>
                </div>
              </div>
              <div className="companion-actions">
                <button
                  className="primary-button small-btn"
                  onClick={() => {
                    sendCompanion({ type: COMPANION_EVENTS.DISMISS });
                    go('Wellbeing', 'pause');
                  }}
                  title="Take a 60-second breathing pause"
                >
                  <Activity size={14}/> 60-second pause
                </button>
                <button
                  className="outline-button small-btn"
                  onClick={() => {
                    sendCompanion({ type: COMPANION_EVENTS.DISMISS });
                    go('Wellbeing');
                  }}
                  title="Record a reflection note"
                >
                  <Heart size={14}/> Reflection note
                </button>
                <button
                  className="text-button small-btn"
                  onClick={() => sendCompanion({ type: COMPANION_EVENTS.DISMISS })}
                  title="Dismiss post-call decompression"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {page === 'Home' && (
            <HomePage
              profile={profile}
              onStartGoogleMeet={(person) => startGoogleMeet(person)}
              go={go}
              say={say}
              people={connections}
              onRemove={removeConnection}
              onAdd={openAddConnection}
              onOpenGuide={openGuide}
              onPromptSelect={(prompt) => {
                setActivePromptText(prompt);
                go('Wellbeing');
              }}
              showQuickActions={showQuickActions}
              onToggleQuickActions={toggleQuickActions}
              onCloseQuickActions={closeMenu}
            />
          )}

          {page === 'Connections' && (
            <ConnectionsPage
              group={selectedGroup}
              setGroup={setSelectedGroup}
              people={connections}
              onStartGoogleMeet={(person) => startGoogleMeet(person)}
              say={say}
              onAdd={openAddConnection}
              onEdit={(c) => openEditConnection(c)}
              onRemove={removeConnection}
            />
          )}

          {page === 'Wellbeing' && (
            <WellbeingPage
              say={say}
              initialPrompt={activePromptText}
              reflections={reflections}
              saveReflections={saveReflections}
              onOpenCrisis={openCrisis}
              activeTab={wellbeingTab}
              setActiveTab={setWellbeingTab}
            />
          )}

          <footer className="app-footer">
            <div className="footer-content">
              <p>© 2026 <b>Hareram Kushwaha</b>. All rights reserved.</p>
              <div className="footer-links">
                <button type="button" onClick={openGuide}>How it works</button>
                <span className="dot">•</span>
                <button type="button" onClick={openCrisis}>Crisis Support</button>
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

      {/* Add Connection Modal */}
      {showConnectionForm && (
        <ConnectionFormModal
          onClose={closeModal}
          onSave={addConnection}
        />
      )}

      {/* Edit Connection Modal */}
      {editingContact && (
        <EditConnectionModal
          contact={editingContact}
          onClose={closeModal}
          onSave={updateConnection}
          onDelete={(c) => { removeConnection(c); closeModal(); }}
        />
      )}

      {/* Settings & Preferences Modal */}
      {showSettings && (
        <SettingsModal
          profile={profile}
          onSave={(p) => { saveProfile(p); closeModal(); say('Preferences saved.'); }}
          onClose={closeModal}
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
              closeModal();
              say('All local data cleared.');
            }
          }}
        />
      )}

      {/* How Saantvana Works Modal */}
      {showGuide && (
        <HowItWorksModal onClose={closeModal}/>
      )}

      {/* Confidential Crisis & Helplines Modal */}
      {showCrisis && (
        <CrisisModal onClose={closeModal}/>
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
          type="button"
          className={`mobile-tab-btn ${page === 'Home' ? 'active' : ''}`}
          onClick={() => go('Home')}
        >
          <Home size={20}/>
          <span>Home</span>
        </button>
        <button
          type="button"
          className={`mobile-tab-btn ${page === 'Connections' ? 'active' : ''}`}
          onClick={() => go('Connections')}
        >
          <Heart size={20}/>
          <span>Connections</span>
          {connections.length > 0 && <span className="mobile-badge">{connections.length}</span>}
        </button>
        <button
          type="button"
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

// Interactive Home Page with Real Carousel, Live Actions, & Google Meet
function HomePage({
  profile,
  onStartGoogleMeet,
  go,
  say,
  people,
  onRemove,
  onAdd,
  onOpenGuide,
  onPromptSelect,
  showQuickActions,
  onToggleQuickActions,
  onCloseQuickActions
}) {
  const [checkIn, setCheckIn] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);

  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
    .format(new Date())
    .toUpperCase();

  const currentPrompt = connectionPrompts[promptIndex];
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile.name ? profile.name.trim().split(' ')[0] : '';
  const greetingText = firstName ? `${timeGreeting}, ${firstName}` : `${timeGreeting}, welcome`;

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="sun-dot"/> {dateLabel}</div>
          <h1>{greetingText} <span className="wave">✦</span></h1>
          <p className="subhead">A little space to check in, and feel a little closer.</p>
        </div>

        {/* Quick Action Button & Menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="round-more"
            aria-label="More options"
            onClick={(e) => { e.stopPropagation(); onToggleQuickActions ? onToggleQuickActions() : null; }}
          >
            <MoreHorizontal size={22}/>
          </button>

          {showQuickActions && (
            <div className="popover-menu" style={{ right: 0, top: 48 }} onClick={(e) => e.stopPropagation()}>
              <button className="popover-item" onClick={() => { onCloseQuickActions?.(); onStartGoogleMeet(); }}>
                <GoogleMeetLogo size={17}/> Instant Google Meet
              </button>
              <button className="popover-item" onClick={() => { onCloseQuickActions?.(); onAdd(); }}>
                <Plus size={17}/> Add connection
              </button>
              <button className="popover-item" onClick={() => { onCloseQuickActions?.(); go('Wellbeing', 'pause'); }}>
                <Activity size={17}/> Mindful breathing pause
              </button>
              <button className="popover-item" onClick={() => { onCloseQuickActions?.(); go('Wellbeing', 'grounding'); }}>
                <ShieldCheck size={17}/> 5-4-3-2-1 Sensory grounding
              </button>
              <button className="popover-item" onClick={() => { onCloseQuickActions?.(); onOpenGuide(); }}>
                <CircleHelp size={17}/> How Saantvana works
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Alive Hero Card with Direct Google Meet Launcher */}
      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="live-dot"/> YOUR CONNECTION MOMENT</div>
          <h2>Presence is a gift<br/>you can share.</h2>
          <p>Make a little room for someone you care about. Connect instantly on Google Meet with calm companion tools.</p>

          <div className="hero-actions">
            <button
              className="google-meet-btn primary-meet"
              onClick={() => onStartGoogleMeet(people[0])}
            >
              <GoogleMeetLogo size={18}/>
              <span>Start Google Meet</span>
            </button>
          </div>

          <div className="hero-caption">
            <ShieldCheck size={16}/> Direct Google Meet enabled · Instant & reliable on all mobile carriers & Wi-Fi
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
          <div className="sample-note">Trusted people stored only on this browser. Connect directly via Google Meet.</div>
        </div>
        <button className="text-button" onClick={() => go('Connections')}>
          All connections ({people.length}) <ArrowRight size={16}/>
        </button>
      </div>

      <div className="people-grid">
        {people.length === 0 ? (
          <div className="empty-people-box">
            <Heart size={28} style={{ color: 'var(--purple)', opacity: 0.85 }}/>
            <div>
              <b>No connections yet</b>
              <p>Add friends, family, or trusted peers to connect via Google Meet.</p>
            </div>
            <button className="primary-button" onClick={onAdd} style={{ marginTop: 6 }}>
              <Plus size={16}/> Add a connection
            </button>
          </div>
        ) : (
          people.slice(0, 3).map((p) => (
            <PersonCard
              key={p.id || p.name}
              person={p}
              onStartGoogleMeet={onStartGoogleMeet}
              say={say}
              onRemove={onRemove}
            />
          ))
        )}
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

function PersonCard({ person, onStartGoogleMeet, say, onRemove }) {
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

// Real Connections Page with Live Search, Filter, and Direct Google Meet
function ConnectionsPage({ group, setGroup, people, onStartGoogleMeet, say, onAdd, onEdit, onRemove }) {
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
          placeholder="Search by name or relationship..."
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
        <ShieldCheck size={16}/> Added connections stay in this browser. Calls launch securely via Google Meet; zero tracking or cloud sync.
      </footer>
    </>
  );
}

// Comprehensive Wellbeing Page with Configurable Pause, 5-4-3-2-1 Grounding, and Saved Reflections
function WellbeingPage({
  say,
  initialPrompt,
  reflections,
  saveReflections,
  onOpenCrisis,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab
}) {
  const [breathingState, sendBreathing] = useMachine(breathingMachine);
  const [groundingState, sendGrounding] = useMachine(groundingMachine);
  const [internalActiveTab, setInternalActiveTab] = useState('pause'); // 'pause' | 'grounding'
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = externalSetActiveTab || setInternalActiveTab;
  const [reflectionText, setReflectionText] = useState(initialPrompt ? `“${initialPrompt}”\n` : '');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const view = getBreathingView(breathingState);
  const groundingView = getGroundingView(groundingState);

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

  // Grounding chime trigger on step transitions
  useEffect(() => {
    if (!soundEnabled || !groundingView.isActive) return;
    playGentleChime(440 + (5 - groundingView.stepNumber) * 45);
  }, [groundingView.state, groundingView.isActive, soundEnabled]);

  const saveCurrentReflection = () => {
    const text = reflectionText.trim();
    if (!text) return;
    const item = {
      id: uid(),
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
          /* 5-4-3-2-1 Somatic Grounding Tool with FSM */
          <section className="wellbeing-feature" style={{ overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="eyebrow">{groundingView.badge.toUpperCase()}</div>
              <button
                className="icon-button"
                style={{ width: 32, height: 32 }}
                title={soundEnabled ? 'Mute chimes' : 'Enable chimes'}
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>}
              </button>
            </div>

            <h2>{groundingView.title}</h2>
            <p>{groundingView.instruction}</p>

            {/* Visual step indicators (5, 4, 3, 2, 1) */}
            <div className="grounding-step-dots" role="tablist" aria-label="Grounding senses">
              {[5, 4, 3, 2, 1].map((stepNum) => {
                const isCurrent = groundingView.stepNumber === stepNum;
                const isDone = groundingView.completedCount > (5 - stepNum);
                return (
                  <div
                    key={stepNum}
                    className={`grounding-dot ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
                    title={`Step ${6 - stepNum}: ${stepNum} senses`}
                  >
                    {isDone ? <Check size={14}/> : stepNum}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="grounding-progress-bar" role="progressbar" aria-valuenow={groundingView.progress} aria-valuemin="0" aria-valuemax="100">
              <div className="grounding-progress-fill" style={{ width: `${groundingView.progress}%` }} />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {groundingView.state === GROUNDING_STATES.IDLE ? (
                <button
                  className="primary-button"
                  onClick={() => sendGrounding({ type: GROUNDING_EVENTS.START })}
                >
                  {groundingView.buttonLabel} <ArrowRight size={16}/>
                </button>
              ) : groundingView.state === GROUNDING_STATES.COMPLETED ? (
                <>
                  <button
                    className="primary-button"
                    onClick={() => sendGrounding({ type: GROUNDING_EVENTS.START })}
                  >
                    <RotateCcw size={16}/> Start another grounding pause
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      sendGrounding({ type: GROUNDING_EVENTS.RESET });
                      setReflectionText((prev) => (prev ? prev + '\n' : '') + 'Grounding complete: checked in with all 5 senses.');
                      say('Grounding anchor added to reflection.');
                    }}
                  >
                    Add note to reflection
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="primary-button"
                    onClick={() => sendGrounding({ type: GROUNDING_EVENTS.NEXT })}
                  >
                    {groundingView.buttonLabel}
                  </button>
                  {groundingView.stepNumber < 5 && (
                    <button
                      className="secondary-button"
                      onClick={() => sendGrounding({ type: GROUNDING_EVENTS.PREV })}
                    >
                      Previous
                    </button>
                  )}
                  <button
                    className="small-btn"
                    onClick={() => sendGrounding({ type: GROUNDING_EVENTS.RESET })}
                    style={{ marginLeft: 'auto' }}
                  >
                    Reset
                  </button>
                </>
              )}
            </div>

            {/* All senses reference summary card list */}
            <div className="grounding-box" style={{ marginTop: 20 }}>
              {[
                { n: 5, sense: 'Sight', text: '5 things you can see (shapes, light patterns, textures)' },
                { n: 4, sense: 'Touch', text: '4 things you can physically feel (feet on floor, fabric, chair)' },
                { n: 3, sense: 'Listen', text: '3 subtle sounds (hum of a fan, distant traffic, breath)' },
                { n: 2, sense: 'Scent & Breath', text: '2 scents in the room or 2 gentle, deep breaths' },
                { n: 1, sense: 'Presence', text: '1 kind thought about yourself or this quiet moment' },
              ].map((item) => (
                <div
                  key={item.n}
                  className="grounding-step-card"
                  style={{
                    borderColor: groundingView.stepNumber === item.n ? 'var(--purple)' : undefined,
                    backgroundColor: groundingView.stepNumber === item.n ? 'var(--purple-subtle, rgba(142, 68, 173, 0.04))' : undefined,
                    opacity: groundingView.isActive && groundingView.stepNumber !== item.n ? 0.65 : 1
                  }}
                >
                  <div
                    className="grounding-num"
                    style={{
                      background: groundingView.stepNumber === item.n ? 'var(--purple)' : undefined,
                      color: groundingView.stepNumber === item.n ? '#fff' : undefined
                    }}
                  >
                    {item.n}
                  </div>
                  <div>
                    <b>{item.sense}</b>
                    <p>{item.text}</p>
                  </div>
                </div>
              ))}
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
                      <Trash2 size={14} style={{ color: 'var(--ink-muted)' }}/>
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
    const initials = clean.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C';
    onSave({
      id: uid(),
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
            placeholder="Enter name"
          />

          <label htmlFor="contact-relation">Relationship / Note</label>
          <input
            id="contact-relation"
            maxLength={48}
            value={relation}
            onChange={(event) => setRelation(event.target.value)}
            placeholder="Enter relationship (e.g. Friend, Family, Colleague)"
          />

          <label htmlFor="contact-meet">Google Meet code or link (optional)</label>
          <input
            id="contact-meet"
            maxLength={120}
            value={meetLink}
            onChange={(event) => setMeetLink(event.target.value)}
            placeholder="Enter Google Meet link (optional)"
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
            placeholder="Enter Google Meet link (optional)"
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
  const [name, setName] = useState(profile.name || '');
  const [space, setSpace] = useState(profile.space || '');
  const [color, setColor] = useState(profile.color || 'lilac');
  const [theme, setTheme] = useState(profile.theme || 'light');
  const [defaultMeetLink, setDefaultMeetLink] = useState(profile.defaultMeetLink || '');

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
      name: name.trim(),
      space: space.trim() || 'My space',
      color,
      theme,
      defaultMeetLink: defaultMeetLink.trim()
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="call-top">
          <div>
            <span className="call-status">PREFERENCES</span>
            <h2 id="settings-title">Profile & Preferences</h2>
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
              value={name}
              placeholder="Enter your name"
              onChange={(e) => setName(e.target.value)}
            />
            <small>Used when greeting you in your space and generating personal notes.</small>
          </div>

          <div className="settings-item">
            <label htmlFor="prof-space">Space Subtitle</label>
            <input
              id="prof-space"
              maxLength={48}
              value={space}
              placeholder="Enter space name (e.g. My space)"
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
            <label htmlFor="prof-meet">Default Personal Google Meet Link (Optional)</label>
            <input
              id="prof-meet"
              placeholder="Enter default Google Meet link (optional)"
              value={defaultMeetLink}
              onChange={(e) => setDefaultMeetLink(e.target.value)}
            />
            <small>
              If provided, this room is used by default when you start Google Meet. Leave empty to auto-generate a new room code on each call.
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
            Google Meet & Calling
          </button>
          <button className={`tab-btn ${guideTab === 'wellbeing' ? 'active' : ''}`} onClick={() => setGuideTab('wellbeing')}>
            Mindfulness & Grounding
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
            <span className="guide-badge"><Video size={15}/> Google Meet Integration</span>
            <h3>Crystal-Clear, Reliable Video Calling</h3>
            <p>Saantvana uses Google Meet as its primary calling engine for effortless, reliable communication:</p>
            <p><b>1. Instant 1-Click Rooms:</b> Generate a brand new, private Google Meet room instantly or save custom links for your trusted contacts.</p>
            <p><b>2. Automatic Invite Copying:</b> Saantvana opens Google Meet in a new tab and automatically copies the join note to your clipboard, ready to send anywhere.</p>
            <p><b>3. 5G/4G & Cellular Reliability:</b> Google Meet handles carrier NAT traversal, adaptive bitrates, AI background noise removal, and crystal-clear screen sharing across Android, iOS, Windows, Mac, and Linux.</p>
            <p><b>4. Calm Companion Mode:</b> While you talk, Saantvana stays open as a peaceful space with a live call timer, mindful breathing pauses, and 5-4-3-2-1 sensory grounding.</p>
          </div>
        )}

        {guideTab === 'wellbeing' && (
          <div className="guide-section">
            <span className="guide-badge"><Activity size={15}/> Somatic Tools</span>
            <h3>Mindful Pauses & 5-4-3-2-1 Sensory Grounding</h3>
            <p>Saantvana is designed around nervous system care and gentle presence:</p>
            <p><b>Guided Breathing Pause:</b> 1-minute, 2-minute, or 3-minute soothing breath cycles with gentle acoustic chimes to decompress before or after deep conversations.</p>
            <p><b>5-4-3-2-1 Sensory Grounding:</b> Step-by-step interactive somatic grounding (sight, touch, sound, scent, gratitude) to settle acute stress or anxiety.</p>
            <p><b>Private Reflections:</b> Local, un-scored journaling prompts to help you articulate what matters most.</p>
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

        {/* 1. Nepal (First) */}
        <div className="crisis-resource-card">
          <b>
            <span>National Suicide Prevention Helpline</span>
            <span className="crisis-badge">Nepal · 24/7 Toll-Free</span>
          </b>
          <p>Government of Nepal official 24/7 toll-free crisis and emotional support helpline operated by Mental Hospital Lagankhel & Ministry of Health and Population.</p>
          <div className="crisis-actions-row">
            <a href="tel:1166" className="crisis-contact-action"><Phone size={14}/> Call 1166 (Toll-Free)</a>
          </div>
        </div>

        <div className="crisis-resource-card">
          <b>
            <span>TUTH & KOSHISH Psychosocial Support</span>
            <span className="crisis-badge">Nepal</span>
          </b>
          <p>Tribhuvan University Teaching Hospital (TUTH) crisis support at 9840021600; KOSHISH National Mental Health Self-Help Helpline at 16600122322; TPO Nepal toll-free at 16600102005.</p>
          <div className="crisis-actions-row">
            <a href="tel:9840021600" className="crisis-contact-action"><Phone size={14}/> Call TUTH 9840021600</a>
            <a href="tel:16600122322" className="crisis-contact-action" style={{ background: '#593ec2' }}><Phone size={14}/> Call KOSHISH 16600122322</a>
          </div>
        </div>

        {/* 2. India (Second) */}
        <div className="crisis-resource-card">
          <b>
            <span>Tele-MANAS National Mental Health Helpline</span>
            <span className="crisis-badge">India · 24/7 Toll-Free</span>
          </b>
          <p>Government of India 24/7 comprehensive tele-mental health programme available across India in 20+ languages via toll-free 14416 or 1800-891-4416.</p>
          <div className="crisis-actions-row">
            <a href="tel:14416" className="crisis-contact-action"><Phone size={14}/> Call 14416</a>
            <a href="tel:18008914416" className="crisis-contact-action" style={{ background: '#593ec2' }}><Phone size={14}/> Call 1800-891-4416</a>
          </div>
        </div>

        <div className="crisis-resource-card">
          <b>
            <span>Vandrevala Foundation & KIRAN Helpline</span>
            <span className="crisis-badge">India · 24/7</span>
          </b>
          <p>Vandrevala Foundation free 24/7 mental health counseling at +91 9999 666 555; Ministry of Social Justice KIRAN mental health helpline at 1800-599-0019.</p>
          <div className="crisis-actions-row">
            <a href="tel:+919999666555" className="crisis-contact-action"><Phone size={14}/> Call +91 9999 666 555</a>
            <a href="tel:18005990019" className="crisis-contact-action" style={{ background: '#593ec2' }}><Phone size={14}/> Call KIRAN 1800-599-0019</a>
          </div>
        </div>

        {/* 3. United States & Canada */}
        <div className="crisis-resource-card">
          <b>
            <span>988 Suicide & Crisis Lifeline</span>
            <span className="crisis-badge">US & Canada · 24/7</span>
          </b>
          <p>Free, confidential support for anyone in suicidal crisis or emotional distress. Call or text 988.</p>
          <div className="crisis-actions-row">
            <a href="tel:988" className="crisis-contact-action"><Phone size={14}/> Call 988</a>
            <a href="sms:988" className="crisis-contact-action" style={{ background: '#593ec2' }}>Text 988</a>
          </div>
        </div>

        {/* 4. United Kingdom */}
        <div className="crisis-resource-card">
          <b>
            <span>Samaritans & NHS 111</span>
            <span className="crisis-badge">United Kingdom · 24/7</span>
          </b>
          <p>Call 116 123 for Samaritans (free 24/7) or call 111 for mental health crisis support.</p>
          <div className="crisis-actions-row">
            <a href="tel:116123" className="crisis-contact-action"><Phone size={14}/> Call 116 123</a>
          </div>
        </div>

        {/* 5. Crisis Text Line */}
        <div className="crisis-resource-card">
          <b>
            <span>Crisis Text Line</span>
            <span className="crisis-badge">US, UK, Canada · 24/7 Free SMS</span>
          </b>
          <p>Connect with a crisis counselor 24/7 over free, confidential SMS text message.</p>
          <div className="crisis-actions-row">
            <a href="sms:741741?&body=HOME" className="crisis-contact-action"><MessageCircle size={14}/> Text HOME to 741741</a>
          </div>
        </div>

        {/* 6. International Directory */}
        <div className="crisis-resource-card">
          <b>
            <span>Befrienders Worldwide</span>
            <span className="crisis-badge">Global Directory</span>
          </b>
          <p>Find free, confidential emotional support and volunteer-led helplines in over 30 countries worldwide.</p>
          <div className="crisis-actions-row">
            <a href="https://www.befrienders.org" target="_blank" rel="noopener noreferrer" className="crisis-contact-action">
              <ExternalLink size={14}/> Visit befrienders.org
            </a>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 18 }}>
          <button className="primary-button" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
