import test from 'node:test';
import assert from 'node:assert/strict';

import { createMachine } from '../src/machines/createMachine.js';
import {
  breathingMachine,
  BREATHING_STATES,
  BREATHING_EVENTS,
  getBreathingView
} from '../src/machines/breathingMachine.js';
import {
  depthMachine,
  VIEWER_STATES,
  CONSENT_STATES,
  DEPTH_EVENTS
} from '../src/machines/depthMachine.js';
import {
  callMachine,
  CALL_STATES,
  CALL_EVENTS
} from '../src/machines/callMachine.js';
import {
  groundingMachine,
  GROUNDING_STATES,
  GROUNDING_EVENTS,
  getGroundingView
} from '../src/machines/groundingMachine.js';
import {
  modalMachine,
  MODAL_STATES,
  MODAL_EVENTS
} from '../src/machines/modalMachine.js';
import {
  menuMachine,
  MENU_STATES,
  MENU_EVENTS
} from '../src/machines/menuMachine.js';
import {
  companionMachine,
  COMPANION_STATES,
  COMPANION_EVENTS,
  getCompanionView
} from '../src/machines/companionMachine.js';

test('createMachine: basic transitions and guards', () => {
  const toggle = createMachine({
    id: 'toggle',
    initial: 'inactive',
    context: { count: 0 },
    states: {
      inactive: {
        on: {
          CLICK: {
            target: 'active',
            actions: (ctx) => ({ ...ctx, count: ctx.count + 1 })
          }
        }
      },
      active: {
        on: {
          CLICK: {
            target: 'inactive',
            actions: (ctx) => ({ ...ctx, count: ctx.count + 1 })
          }
        }
      }
    }
  });

  const s0 = toggle.getInitialState();
  assert.equal(s0.value, 'inactive');
  assert.equal(s0.context.count, 0);
  assert.equal(s0.matches('inactive'), true);
  assert.equal(s0.can('CLICK'), true);
  assert.equal(s0.can('UNKNOWN'), false);

  const s1 = toggle.transition(s0.value, s0.context, { type: 'CLICK' });
  assert.equal(s1.value, 'active');
  assert.equal(s1.context.count, 1);
  assert.equal(s1.changed, true);

  const s2 = toggle.transition(s1.value, s1.context, { type: 'INVALID' });
  assert.equal(s2.value, 'active');
  assert.equal(s2.context.count, 1);
  assert.equal(s2.changed, false);
});

test('breathingMachine: full lifecycle and cycle calculations', () => {
  let s = breathingMachine.getInitialState();
  assert.equal(s.value, BREATHING_STATES.IDLE);
  assert.equal(s.context.seconds, 60);

  const viewInitial = getBreathingView(s);
  assert.equal(viewInitial.label, 'Ready when you are');
  assert.equal(viewInitial.buttonLabel, 'Begin a quiet pause');
  assert.equal(viewInitial.isActive, false);

  // Start breathing
  s = breathingMachine.transition(s.value, s.context, { type: BREATHING_EVENTS.TOGGLE });
  assert.equal(s.value, BREATHING_STATES.INHALING);
  assert.equal(s.context.seconds, 60);

  // Inhale is seconds 60 down to 57 (0..4s elapsed: 60, 59, 58, 57)
  // Tick to 59
  s = breathingMachine.transition(s.value, s.context, { type: BREATHING_EVENTS.TICK });
  assert.equal(s.context.seconds, 59);
  assert.equal(s.value, BREATHING_STATES.INHALING);

  // Tick through to 56 (4s elapsed: (60-56)=4 -> HOLDING)
  s = breathingMachine.transition(s.value, s.context, { type: BREATHING_EVENTS.TICK }); // 58
  s = breathingMachine.transition(s.value, s.context, { type: BREATHING_EVENTS.TICK }); // 57
  s = breathingMachine.transition(s.value, s.context, { type: BREATHING_EVENTS.TICK }); // 56
  assert.equal(s.context.seconds, 56);
  assert.equal(s.value, BREATHING_STATES.HOLDING);

  const viewHold = getBreathingView(s);
  assert.equal(viewHold.label, 'Rest softly');
  assert.equal(viewHold.isActive, true);

  // Pause mid-exercise
  s = breathingMachine.transition(s.value, s.context, { type: BREATHING_EVENTS.TOGGLE });
  assert.equal(s.value, BREATHING_STATES.PAUSED);
  const viewPaused = getBreathingView(s);
  assert.equal(viewPaused.label, 'Paused · Rest here');
  assert.equal(viewPaused.buttonLabel, 'Continue');
  assert.equal(viewPaused.isActive, false);

  // Resume returns to current phase
  s = breathingMachine.transition(s.value, s.context, { type: BREATHING_EVENTS.TOGGLE });
  assert.equal(s.value, BREATHING_STATES.HOLDING);

  // Test completion at 1 second
  s = breathingMachine.transition(BREATHING_STATES.EXHALING, { seconds: 1, totalSeconds: 60 }, { type: BREATHING_EVENTS.TICK });
  assert.equal(s.value, BREATHING_STATES.COMPLETED);
  assert.equal(s.context.seconds, 0);

  const viewComplete = getBreathingView(s);
  assert.equal(viewComplete.label, 'Pause complete');
  assert.equal(viewComplete.buttonLabel, 'Start again');
  assert.equal(viewComplete.isCompleted, true);

  // Reset/Restart
  s = breathingMachine.transition(s.value, s.context, { type: BREATHING_EVENTS.TOGGLE });
  assert.equal(s.value, BREATHING_STATES.IDLE);
  assert.equal(s.context.seconds, 60);

  // Custom Duration Test (e.g. 120s / 2min)
  s = breathingMachine.transition(s.value, s.context, {
    type: BREATHING_EVENTS.SET_DURATION,
    duration: 120
  });
  assert.equal(s.value, BREATHING_STATES.IDLE);
  assert.equal(s.context.seconds, 120);
  assert.equal(s.context.totalSeconds, 120);

  s = breathingMachine.transition(s.value, s.context, { type: BREATHING_EVENTS.TOGGLE });
  assert.equal(s.value, BREATHING_STATES.INHALING);
  assert.equal(s.context.seconds, 120);
});

test('depthMachine: requester workflow and two-party consent', () => {
  let s = depthMachine.getInitialState();
  assert.equal(s.context.viewerState, VIEWER_STATES.DISABLED);
  assert.equal(s.context.consentState, CONSENT_STATES.IDLE);

  // Stream connected -> ready for request
  s = depthMachine.transition(s.value, s.context, { type: DEPTH_EVENTS.STREAM_CONNECTED });
  assert.equal(s.context.viewerState, VIEWER_STATES.IDLE);

  // Requester sends depth request
  s = depthMachine.transition(s.value, s.context, { type: DEPTH_EVENTS.REQUEST_DEPTH });
  assert.equal(s.context.viewerState, VIEWER_STATES.REQUESTING);

  // Peer declines
  s = depthMachine.transition(s.value, s.context, {
    type: DEPTH_EVENTS.PEER_CONSENT_RESPONSE,
    allowed: false
  });
  assert.equal(s.context.viewerState, VIEWER_STATES.DECLINED);

  // Requester re-requests
  s = depthMachine.transition(s.value, s.context, { type: DEPTH_EVENTS.REQUEST_DEPTH });
  assert.equal(s.context.viewerState, VIEWER_STATES.REQUESTING);

  // Peer approves
  s = depthMachine.transition(s.value, s.context, {
    type: DEPTH_EVENTS.PEER_CONSENT_RESPONSE,
    allowed: true
  });
  assert.equal(s.context.viewerState, VIEWER_STATES.APPROVED);

  // Model loading and activation
  s = depthMachine.transition(s.value, s.context, { type: DEPTH_EVENTS.MODEL_LOAD_START });
  assert.equal(s.context.viewerState, VIEWER_STATES.LOADING_MODEL);

  s = depthMachine.transition(s.value, s.context, { type: DEPTH_EVENTS.MODEL_LOAD_SUCCESS });
  assert.equal(s.context.viewerState, VIEWER_STATES.ACTIVE);

  // Requester toggles depth view off locally
  s = depthMachine.transition(s.value, s.context, { type: DEPTH_EVENTS.TOGGLE_DEPTH });
  assert.equal(s.context.viewerState, VIEWER_STATES.PAUSED);

  // Requester toggles depth view back on locally
  s = depthMachine.transition(s.value, s.context, { type: DEPTH_EVENTS.TOGGLE_DEPTH });
  assert.equal(s.context.viewerState, VIEWER_STATES.ACTIVE);

  // Peer revokes consent
  s = depthMachine.transition(s.value, s.context, {
    type: DEPTH_EVENTS.PEER_CONSENT_RESPONSE,
    allowed: false,
    revoked: true
  });
  assert.equal(s.context.viewerState, VIEWER_STATES.REVOKED);

  // Consent provider workflow
  s = depthMachine.transition(s.value, s.context, {
    type: DEPTH_EVENTS.PEER_REQUEST_RECEIVED,
    name: 'Jordan Lee'
  });
  assert.equal(s.context.consentState, CONSENT_STATES.PROMPTED);
  assert.equal(s.context.promptRequesterName, 'Jordan Lee');

  // Allow consent
  s = depthMachine.transition(s.value, s.context, {
    type: DEPTH_EVENTS.RESPOND_TO_CONSENT,
    allow: true
  });
  assert.equal(s.context.consentState, CONSENT_STATES.GRANTED);

  // Revoke consent
  s = depthMachine.transition(s.value, s.context, { type: DEPTH_EVENTS.REVOKE_CONSENT });
  assert.equal(s.context.consentState, CONSENT_STATES.IDLE);
});

test('callMachine: WebRTC call connection and disconnect lifecycle', () => {
  let s = callMachine.getInitialState();
  assert.equal(s.value, CALL_STATES.IDLE);

  // Host starts call
  s = callMachine.transition(s.value, s.context, {
    type: CALL_EVENTS.START,
    person: { name: 'Maya Chen', room: 'ABCDEF12', role: 'host' }
  });
  assert.equal(s.value, CALL_STATES.REQUESTING_MEDIA);
  assert.equal(s.context.role, 'host');

  // Permissions granted
  const dummyStream = { id: 'local-1' };
  s = callMachine.transition(s.value, s.context, {
    type: CALL_EVENTS.LOCAL_STREAM_ACQUIRED,
    stream: dummyStream
  });
  assert.equal(s.value, CALL_STATES.CONNECTING_SIGNAL);
  assert.equal(s.context.localStream, dummyStream);

  // Joined room as host
  s = callMachine.transition(s.value, s.context, {
    type: CALL_EVENTS.SOCKET_JOINED,
    role: 'host'
  });
  assert.equal(s.value, CALL_STATES.ROOM_READY);

  // Peer joins -> negotiating
  s = callMachine.transition(s.value, s.context, {
    type: CALL_EVENTS.PEER_JOINED,
    name: 'Maya'
  });
  assert.equal(s.value, CALL_STATES.NEGOTIATING);
  assert.equal(s.context.peerName, 'Maya');

  // Remote stream received -> connected
  const dummyRemoteStream = { id: 'remote-1' };
  s = callMachine.transition(s.value, s.context, {
    type: CALL_EVENTS.REMOTE_TRACK_RECEIVED,
    stream: dummyRemoteStream
  });
  assert.equal(s.value, CALL_STATES.CONNECTED);
  assert.equal(s.context.remoteStream, dummyRemoteStream);

  // Track toggling
  s = callMachine.transition(s.value, s.context, {
    type: CALL_EVENTS.TOGGLE_TRACK,
    kind: 'audio'
  });
  assert.equal(s.context.micEnabled, false);

  s = callMachine.transition(s.value, s.context, {
    type: CALL_EVENTS.TOGGLE_TRACK,
    kind: 'video'
  });
  assert.equal(s.context.cameraEnabled, false);

  // Peer leaves
  s = callMachine.transition(s.value, s.context, { type: CALL_EVENTS.PEER_LEFT });
  assert.equal(s.value, CALL_STATES.PEER_LEFT);
  assert.equal(s.context.remoteStream, null);

  // End call
  s = callMachine.transition(s.value, s.context, { type: CALL_EVENTS.END_CALL });
  assert.equal(s.value, CALL_STATES.ENDED);
});

test('groundingMachine: 5-4-3-2-1 somatic sensory steps progression and view', () => {
  let s = groundingMachine.getInitialState();
  assert.equal(s.value, GROUNDING_STATES.IDLE);
  assert.equal(s.context.step, 0);

  const initialView = getGroundingView(s);
  assert.equal(initialView.isActive, false);
  assert.equal(initialView.isCompleted, false);
  assert.equal(initialView.buttonLabel, 'Begin sensory grounding');

  // Start grounding
  s = groundingMachine.transition(s.value, s.context, { type: GROUNDING_EVENTS.START });
  assert.equal(s.value, GROUNDING_STATES.SEE);
  assert.equal(s.context.step, 5);
  assert.equal(s.context.completedCount, 0);

  let view = getGroundingView(s);
  assert.equal(view.isActive, true);
  assert.equal(view.stepNumber, 5);
  assert.equal(view.sense, 'Sight');

  // Next: Touch (4)
  s = groundingMachine.transition(s.value, s.context, { type: GROUNDING_EVENTS.NEXT });
  assert.equal(s.value, GROUNDING_STATES.TOUCH);
  assert.equal(s.context.step, 4);
  assert.equal(s.context.completedCount, 1);

  // Prev: Back to See (5)
  s = groundingMachine.transition(s.value, s.context, { type: GROUNDING_EVENTS.PREV });
  assert.equal(s.value, GROUNDING_STATES.SEE);
  assert.equal(s.context.step, 5);

  // Step through touch -> hear -> scent -> appreciate -> completed
  s = groundingMachine.transition(s.value, s.context, { type: GROUNDING_EVENTS.NEXT }); // Touch
  s = groundingMachine.transition(s.value, s.context, { type: GROUNDING_EVENTS.NEXT }); // Hear
  assert.equal(s.value, GROUNDING_STATES.HEAR);
  assert.equal(s.context.step, 3);
  assert.equal(s.context.completedCount, 2);

  s = groundingMachine.transition(s.value, s.context, { type: GROUNDING_EVENTS.NEXT }); // Scent
  assert.equal(s.value, GROUNDING_STATES.SCENT);
  assert.equal(s.context.step, 2);

  s = groundingMachine.transition(s.value, s.context, { type: GROUNDING_EVENTS.NEXT }); // Appreciate
  assert.equal(s.value, GROUNDING_STATES.APPRECIATE);
  assert.equal(s.context.step, 1);

  s = groundingMachine.transition(s.value, s.context, { type: GROUNDING_EVENTS.NEXT }); // Completed
  assert.equal(s.value, GROUNDING_STATES.COMPLETED);
  assert.equal(s.context.completedCount, 5);

  const completedView = getGroundingView(s);
  assert.equal(completedView.isCompleted, true);
  assert.equal(completedView.isActive, false);
  assert.equal(completedView.progress, 100);

  // Reset to idle
  s = groundingMachine.transition(s.value, s.context, { type: GROUNDING_EVENTS.RESET });
  assert.equal(s.value, GROUNDING_STATES.IDLE);
  assert.equal(s.context.completedCount, 0);
});

test('modalMachine: single-dialog overlay coordination without collision', () => {
  let s = modalMachine.getInitialState();
  assert.equal(s.value, MODAL_STATES.IDLE);
  assert.equal(s.context.targetPerson, null);

  // Open Settings
  s = modalMachine.transition(s.value, s.context, { type: MODAL_EVENTS.OPEN_SETTINGS });
  assert.equal(s.value, MODAL_STATES.SETTINGS);

  // Transition from Settings to Crisis Support (preserves previousModal for stack awareness)
  s = modalMachine.transition(s.value, s.context, { type: MODAL_EVENTS.OPEN_CRISIS });
  assert.equal(s.value, MODAL_STATES.CRISIS);
  assert.equal(s.context.previousModal, MODAL_STATES.SETTINGS);

  // Close returns to IDLE
  s = modalMachine.transition(s.value, s.context, { type: MODAL_EVENTS.CLOSE });
  assert.equal(s.value, MODAL_STATES.IDLE);

  // Open Call Choice with target contact payload
  const mockPerson = { id: 'p-1', name: 'Maya Chen' };
  s = modalMachine.transition(s.value, s.context, {
    type: MODAL_EVENTS.OPEN_CALL_CHOICE,
    person: mockPerson
  });
  assert.equal(s.value, MODAL_STATES.CALL_CHOICE);
  assert.equal(s.context.targetPerson, mockPerson);

  // Close
  s = modalMachine.transition(s.value, s.context, { type: MODAL_EVENTS.CLOSE });
  assert.equal(s.value, MODAL_STATES.IDLE);
  assert.equal(s.context.targetPerson, null);

  // Open Edit Connection
  s = modalMachine.transition(s.value, s.context, {
    type: MODAL_EVENTS.OPEN_EDIT_CONNECTION,
    contact: mockPerson
  });
  assert.equal(s.value, MODAL_STATES.EDIT_CONNECTION);
  assert.equal(s.context.targetPerson, mockPerson);

  // Directly transition from Edit Connection to Add Connection without deadlocking
  s = modalMachine.transition(s.value, s.context, { type: MODAL_EVENTS.OPEN_ADD_CONNECTION });
  assert.equal(s.value, MODAL_STATES.ADD_CONNECTION);

  // Open Call Choice with undefined person safely falls back to defaultModalPerson
  s = modalMachine.transition(s.value, s.context, { type: MODAL_EVENTS.OPEN_CALL_CHOICE });
  assert.equal(s.value, MODAL_STATES.CALL_CHOICE);
  assert.ok(s.context.targetPerson);
  assert.equal(s.context.targetPerson.name, 'A connection');

  s = modalMachine.transition(s.value, s.context, { type: MODAL_EVENTS.CLOSE });
  assert.equal(s.value, MODAL_STATES.IDLE);
});

test('menuMachine: mutually exclusive popovers and dismissal', () => {
  let s = menuMachine.getInitialState();
  assert.equal(s.value, MENU_STATES.CLOSED);
  assert.equal(s.context.activeMenu, null);

  // Toggle notifications open
  s = menuMachine.transition(s.value, s.context, { type: MENU_EVENTS.TOGGLE_NOTIFICATIONS });
  assert.equal(s.value, MENU_STATES.NOTIFICATIONS);
  assert.equal(s.context.activeMenu, MENU_STATES.NOTIFICATIONS);

  // Switching directly to quick actions closes notifications
  s = menuMachine.transition(s.value, s.context, { type: MENU_EVENTS.OPEN_QUICK_ACTIONS });
  assert.equal(s.value, MENU_STATES.QUICK_ACTIONS);
  assert.equal(s.context.activeMenu, MENU_STATES.QUICK_ACTIONS);

  // Toggling workspace closes quick actions and opens workspace
  s = menuMachine.transition(s.value, s.context, { type: MENU_EVENTS.TOGGLE_WORKSPACE });
  assert.equal(s.value, MENU_STATES.WORKSPACE);

  // Toggle workspace again closes it
  s = menuMachine.transition(s.value, s.context, { type: MENU_EVENTS.TOGGLE_WORKSPACE });
  assert.equal(s.value, MENU_STATES.CLOSED);
  assert.equal(s.context.activeMenu, null);

  // Close when already closed is a safe no-op
  s = menuMachine.transition(s.value, s.context, { type: MENU_EVENTS.CLOSE });
  assert.equal(s.value, MENU_STATES.CLOSED);
});

test('companionMachine: Google Meet session lifecycle and post-call decompression', () => {
  let s = companionMachine.getInitialState();
  assert.equal(s.value, COMPANION_STATES.IDLE);
  assert.equal(s.context.person, null);
  assert.equal(s.context.elapsed, 0);

  const initialView = getCompanionView(s);
  assert.equal(initialView.isIdle, true);
  assert.equal(initialView.isActive, false);
  assert.equal(initialView.isPostCall, false);

  // Start call
  const targetPerson = { id: 'p-1', name: 'Maya Chen' };
  s = companionMachine.transition(s.value, s.context, {
    type: COMPANION_EVENTS.START,
    person: targetPerson,
    meetUrl: 'https://meet.google.com/test-room'
  });
  assert.equal(s.value, COMPANION_STATES.ACTIVE);
  assert.equal(s.context.person.name, 'Maya Chen');
  assert.equal(s.context.elapsed, 0);

  let view = getCompanionView(s);
  assert.equal(view.isActive, true);
  assert.equal(view.personName, 'Maya Chen');
  assert.equal(view.formattedElapsed, '00:00');

  // Tick elapsed time
  s = companionMachine.transition(s.value, s.context, { type: COMPANION_EVENTS.TICK });
  s = companionMachine.transition(s.value, s.context, { type: COMPANION_EVENTS.TICK });
  assert.equal(s.context.elapsed, 2);
  view = getCompanionView(s);
  assert.equal(view.formattedElapsed, '00:02');

  // Finish call -> transitions to POST_CALL decompression state
  s = companionMachine.transition(s.value, s.context, { type: COMPANION_EVENTS.FINISH });
  assert.equal(s.value, COMPANION_STATES.POST_CALL);
  assert.ok(s.context.endedAt);
  view = getCompanionView(s);
  assert.equal(view.isPostCall, true);
  assert.equal(view.isActive, false);

  // Dismiss post-call returns to IDLE
  s = companionMachine.transition(s.value, s.context, { type: COMPANION_EVENTS.DISMISS });
  assert.equal(s.value, COMPANION_STATES.IDLE);
  assert.equal(s.context.person, null);
  assert.equal(s.context.elapsed, 0);
});
