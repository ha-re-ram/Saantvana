/**
 * @file callMachine.js
 * Explicit Finite State Machine for 1:1 WebRTC Call and Signaling Lifecycle.
 * Provides deterministic transitions for media acquisition, WebSocket signaling,
 * ICE negotiation, and peer disconnect/reconnect.
 */

import { createMachine } from './createMachine.js';

export const CALL_STATES = {
  IDLE: 'IDLE',
  REQUESTING_MEDIA: 'REQUESTING_MEDIA',
  CONNECTING_SIGNAL: 'CONNECTING_SIGNAL',
  ROOM_READY: 'ROOM_READY',
  ROOM_JOINING: 'ROOM_JOINING',
  WAITING_FOR_PEER: 'WAITING_FOR_PEER',
  NEGOTIATING: 'NEGOTIATING',
  CONNECTED: 'CONNECTED',
  PEER_LEFT: 'PEER_LEFT',
  ERROR: 'ERROR',
  ENDED: 'ENDED'
};

export const CALL_EVENTS = {
  START: 'START',
  LOCAL_STREAM_ACQUIRED: 'LOCAL_STREAM_ACQUIRED',
  MEDIA_ERROR: 'MEDIA_ERROR',
  SOCKET_JOINED: 'SOCKET_JOINED',
  SOCKET_WAITING: 'SOCKET_WAITING',
  PEER_JOINED: 'PEER_JOINED',
  OFFER_RECEIVED: 'OFFER_RECEIVED',
  ANSWER_RECEIVED: 'ANSWER_RECEIVED',
  REMOTE_TRACK_RECEIVED: 'REMOTE_TRACK_RECEIVED',
  CONNECTION_CONNECTED: 'CONNECTION_CONNECTED',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  PEER_LEFT: 'PEER_LEFT',
  SOCKET_ERROR: 'SOCKET_ERROR',
  SOCKET_CLOSED: 'SOCKET_CLOSED',
  TOGGLE_TRACK: 'TOGGLE_TRACK',
  SET_COPIED: 'SET_COPIED',
  END_CALL: 'END_CALL'
};

export const initialCallContext = {
  person: null,
  role: 'host',
  peerName: '',
  localStream: null,
  remoteStream: null,
  micEnabled: true,
  cameraEnabled: true,
  copied: false,
  status: 'Requesting camera and microphone…',
  error: ''
};

export const callMachine = createMachine({
  id: 'webrtcCallLifecycle',
  initial: CALL_STATES.IDLE,
  context: initialCallContext,
  states: {
    [CALL_STATES.IDLE]: {
      on: {
        [CALL_EVENTS.START]: {
          target: CALL_STATES.REQUESTING_MEDIA,
          actions: (ctx, evt) => ({
            ...ctx,
            person: evt.person,
            role: evt.person.role || (evt.person.room ? 'guest' : 'host'),
            peerName: evt.person.name || 'Your connection',
            status: 'Requesting camera and microphone…',
            error: ''
          })
        }
      }
    },
    [CALL_STATES.REQUESTING_MEDIA]: {
      on: {
        [CALL_EVENTS.LOCAL_STREAM_ACQUIRED]: {
          target: CALL_STATES.CONNECTING_SIGNAL,
          actions: (ctx, evt) => ({
            ...ctx,
            localStream: evt.stream,
            status: 'Connecting to the call room…',
            error: ''
          })
        },
        [CALL_EVENTS.MEDIA_ERROR]: {
          target: CALL_STATES.ERROR,
          actions: (ctx, evt) => ({
            ...ctx,
            error: evt.error || 'Could not start camera and microphone.',
            status: 'Permission denied or media unavailable'
          })
        },
        [CALL_EVENTS.END_CALL]: CALL_STATES.ENDED
      }
    },
    [CALL_STATES.CONNECTING_SIGNAL]: {
      on: {
        [CALL_EVENTS.SOCKET_JOINED]: [
          {
            guard: (_, evt) => evt.role === 'host',
            target: CALL_STATES.ROOM_READY,
            actions: (ctx, evt) => ({
              ...ctx,
              role: 'host',
              peerName: evt.peerName || ctx.peerName,
              status: 'Room ready · share the invite link'
            })
          },
          {
            target: CALL_STATES.ROOM_JOINING,
            actions: (ctx, evt) => ({
              ...ctx,
              role: 'guest',
              peerName: evt.peerName || ctx.peerName,
              status: 'Joined · connecting securely…'
            })
          }
        ],
        [CALL_EVENTS.SOCKET_ERROR]: {
          target: CALL_STATES.ERROR,
          actions: (ctx, evt) => ({
            ...ctx,
            error: evt.message || 'Could not reach Saantvana’s signaling service. Check that the app server is running.'
          })
        },
        [CALL_EVENTS.END_CALL]: CALL_STATES.ENDED
      }
    },
    [CALL_STATES.ROOM_READY]: {
      on: {
        [CALL_EVENTS.SOCKET_WAITING]: {
          target: CALL_STATES.WAITING_FOR_PEER,
          actions: (ctx) => ({
            ...ctx,
            status: 'Waiting for someone to join…'
          })
        },
        [CALL_EVENTS.PEER_JOINED]: {
          target: CALL_STATES.NEGOTIATING,
          actions: (ctx, evt) => ({
            ...ctx,
            peerName: evt.name || ctx.peerName,
            status: 'Connection found · establishing peer-to-peer media…'
          })
        },
        [CALL_EVENTS.SOCKET_CLOSED]: {
          target: CALL_STATES.ERROR,
          actions: (ctx) => ({
            ...ctx,
            status: 'Call connection closed.'
          })
        },
        [CALL_EVENTS.SOCKET_ERROR]: {
          target: CALL_STATES.ERROR,
          actions: (ctx, evt) => ({
            ...ctx,
            error: evt.message || 'Signaling error occurred.'
          })
        },
        [CALL_EVENTS.END_CALL]: CALL_STATES.ENDED,
        [CALL_EVENTS.SET_COPIED]: {
          target: CALL_STATES.ROOM_READY,
          actions: (ctx, evt) => ({ ...ctx, copied: evt.copied })
        },
        [CALL_EVENTS.TOGGLE_TRACK]: {
          target: CALL_STATES.ROOM_READY,
          actions: (ctx, evt) => {
            if (evt.kind === 'audio') return { ...ctx, micEnabled: !ctx.micEnabled };
            if (evt.kind === 'video') return { ...ctx, cameraEnabled: !ctx.cameraEnabled };
            return ctx;
          }
        }
      }
    },
    [CALL_STATES.WAITING_FOR_PEER]: {
      on: {
        [CALL_EVENTS.PEER_JOINED]: {
          target: CALL_STATES.NEGOTIATING,
          actions: (ctx, evt) => ({
            ...ctx,
            peerName: evt.name || ctx.peerName,
            status: 'Connection found · establishing peer-to-peer media…'
          })
        },
        [CALL_EVENTS.SOCKET_CLOSED]: {
          target: CALL_STATES.ERROR,
          actions: (ctx) => ({
            ...ctx,
            status: 'Call connection closed.'
          })
        },
        [CALL_EVENTS.SOCKET_ERROR]: {
          target: CALL_STATES.ERROR,
          actions: (ctx, evt) => ({
            ...ctx,
            error: evt.message || 'Signaling error occurred.'
          })
        },
        [CALL_EVENTS.END_CALL]: CALL_STATES.ENDED,
        [CALL_EVENTS.SET_COPIED]: {
          target: CALL_STATES.WAITING_FOR_PEER,
          actions: (ctx, evt) => ({ ...ctx, copied: evt.copied })
        },
        [CALL_EVENTS.TOGGLE_TRACK]: {
          target: CALL_STATES.WAITING_FOR_PEER,
          actions: (ctx, evt) => {
            if (evt.kind === 'audio') return { ...ctx, micEnabled: !ctx.micEnabled };
            if (evt.kind === 'video') return { ...ctx, cameraEnabled: !ctx.cameraEnabled };
            return ctx;
          }
        }
      }
    },
    [CALL_STATES.ROOM_JOINING]: {
      on: {
        [CALL_EVENTS.PEER_JOINED]: {
          target: CALL_STATES.NEGOTIATING,
          actions: (ctx, evt) => ({
            ...ctx,
            peerName: evt.name || ctx.peerName,
            status: 'Connection found · establishing peer-to-peer media…'
          })
        },
        [CALL_EVENTS.OFFER_RECEIVED]: {
          target: CALL_STATES.NEGOTIATING,
          actions: (ctx) => ({
            ...ctx,
            status: 'Connecting your audio and video…'
          })
        },
        [CALL_EVENTS.SOCKET_CLOSED]: {
          target: CALL_STATES.ERROR,
          actions: (ctx) => ({
            ...ctx,
            status: 'Call connection closed.'
          })
        },
        [CALL_EVENTS.SOCKET_ERROR]: {
          target: CALL_STATES.ERROR,
          actions: (ctx, evt) => ({
            ...ctx,
            error: evt.message || 'Signaling error occurred.'
          })
        },
        [CALL_EVENTS.END_CALL]: CALL_STATES.ENDED,
        [CALL_EVENTS.SET_COPIED]: {
          target: CALL_STATES.ROOM_JOINING,
          actions: (ctx, evt) => ({ ...ctx, copied: evt.copied })
        },
        [CALL_EVENTS.TOGGLE_TRACK]: {
          target: CALL_STATES.ROOM_JOINING,
          actions: (ctx, evt) => {
            if (evt.kind === 'audio') return { ...ctx, micEnabled: !ctx.micEnabled };
            if (evt.kind === 'video') return { ...ctx, cameraEnabled: !ctx.cameraEnabled };
            return ctx;
          }
        }
      }
    },
    [CALL_STATES.NEGOTIATING]: {
      on: {
        [CALL_EVENTS.ANSWER_RECEIVED]: {
          target: CALL_STATES.NEGOTIATING,
          actions: (ctx) => ({
            ...ctx,
            status: 'Connecting your audio and video…'
          })
        },
        [CALL_EVENTS.REMOTE_TRACK_RECEIVED]: {
          target: CALL_STATES.CONNECTED,
          actions: (ctx, evt) => ({
            ...ctx,
            remoteStream: evt.stream,
            status: 'You’re together · peer-to-peer call'
          })
        },
        [CALL_EVENTS.CONNECTION_CONNECTED]: {
          target: CALL_STATES.CONNECTED,
          actions: (ctx) => ({
            ...ctx,
            status: 'You’re together · peer-to-peer call'
          })
        },
        [CALL_EVENTS.CONNECTION_FAILED]: {
          target: CALL_STATES.ERROR,
          actions: (ctx, evt) => ({
            ...ctx,
            error: evt.message || 'Could not connect. This network may need a TURN relay.'
          })
        },
        [CALL_EVENTS.PEER_LEFT]: {
          target: CALL_STATES.PEER_LEFT,
          actions: (ctx) => ({
            ...ctx,
            remoteStream: null,
            status: 'The other person left the call. You can share the link again.'
          })
        },
        [CALL_EVENTS.SOCKET_CLOSED]: {
          target: CALL_STATES.ERROR,
          actions: (ctx) => ({
            ...ctx,
            status: 'Call connection closed.'
          })
        },
        [CALL_EVENTS.END_CALL]: CALL_STATES.ENDED,
        [CALL_EVENTS.SET_COPIED]: {
          target: CALL_STATES.NEGOTIATING,
          actions: (ctx, evt) => ({ ...ctx, copied: evt.copied })
        },
        [CALL_EVENTS.TOGGLE_TRACK]: {
          target: CALL_STATES.NEGOTIATING,
          actions: (ctx, evt) => {
            if (evt.kind === 'audio') return { ...ctx, micEnabled: !ctx.micEnabled };
            if (evt.kind === 'video') return { ...ctx, cameraEnabled: !ctx.cameraEnabled };
            return ctx;
          }
        }
      }
    },
    [CALL_STATES.CONNECTED]: {
      on: {
        [CALL_EVENTS.REMOTE_TRACK_RECEIVED]: {
          target: CALL_STATES.CONNECTED,
          actions: (ctx, evt) => ({
            ...ctx,
            remoteStream: evt.stream
          })
        },
        [CALL_EVENTS.PEER_LEFT]: {
          target: CALL_STATES.PEER_LEFT,
          actions: (ctx) => ({
            ...ctx,
            remoteStream: null,
            status: 'The other person left the call. You can share the link again.'
          })
        },
        [CALL_EVENTS.CONNECTION_FAILED]: {
          target: CALL_STATES.ERROR,
          actions: (ctx, evt) => ({
            ...ctx,
            error: evt.message || 'Could not connect. This network may need a TURN relay.'
          })
        },
        [CALL_EVENTS.SOCKET_CLOSED]: {
          target: CALL_STATES.ERROR,
          actions: (ctx) => ({
            ...ctx,
            status: 'Call connection closed.'
          })
        },
        [CALL_EVENTS.END_CALL]: CALL_STATES.ENDED,
        [CALL_EVENTS.SET_COPIED]: {
          target: CALL_STATES.CONNECTED,
          actions: (ctx, evt) => ({ ...ctx, copied: evt.copied })
        },
        [CALL_EVENTS.TOGGLE_TRACK]: {
          target: CALL_STATES.CONNECTED,
          actions: (ctx, evt) => {
            if (evt.kind === 'audio') return { ...ctx, micEnabled: !ctx.micEnabled };
            if (evt.kind === 'video') return { ...ctx, cameraEnabled: !ctx.cameraEnabled };
            return ctx;
          }
        }
      }
    },
    [CALL_STATES.PEER_LEFT]: {
      on: {
        [CALL_EVENTS.PEER_JOINED]: {
          target: CALL_STATES.NEGOTIATING,
          actions: (ctx, evt) => ({
            ...ctx,
            peerName: evt.name || ctx.peerName,
            status: 'Connection found · establishing peer-to-peer media…'
          })
        },
        [CALL_EVENTS.END_CALL]: CALL_STATES.ENDED,
        [CALL_EVENTS.SET_COPIED]: {
          target: CALL_STATES.PEER_LEFT,
          actions: (ctx, evt) => ({ ...ctx, copied: evt.copied })
        },
        [CALL_EVENTS.TOGGLE_TRACK]: {
          target: CALL_STATES.PEER_LEFT,
          actions: (ctx, evt) => {
            if (evt.kind === 'audio') return { ...ctx, micEnabled: !ctx.micEnabled };
            if (evt.kind === 'video') return { ...ctx, cameraEnabled: !ctx.cameraEnabled };
            return ctx;
          }
        }
      }
    },
    [CALL_STATES.ERROR]: {
      on: {
        [CALL_EVENTS.END_CALL]: CALL_STATES.ENDED
      }
    },
    [CALL_STATES.ENDED]: {
      on: {
        [CALL_EVENTS.START]: CALL_STATES.REQUESTING_MEDIA
      }
    }
  }
});
