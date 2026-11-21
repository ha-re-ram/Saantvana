/**
 * @file depthMachine.js
 * Explicit Finite State Machine for AI Depth Estimation and Two-Party Consent.
 * Ensures strict, verifiable adherence to user consent, device fallbacks,
 * and eliminates desynchronized boolean flags.
 */

import { createMachine } from './createMachine.js';

export const VIEWER_STATES = {
  DISABLED: 'DISABLED',
  IDLE: 'IDLE',
  REQUESTING: 'REQUESTING',
  APPROVED: 'APPROVED',
  LOADING_MODEL: 'LOADING_MODEL',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DECLINED: 'DECLINED',
  REVOKED: 'REVOKED',
  ERROR: 'ERROR'
};

export const CONSENT_STATES = {
  IDLE: 'IDLE',
  PROMPTED: 'PROMPTED',
  GRANTED: 'GRANTED'
};

export const DEPTH_EVENTS = {
  STREAM_CONNECTED: 'STREAM_CONNECTED',
  STREAM_DISCONNECTED: 'STREAM_DISCONNECTED',
  REQUEST_DEPTH: 'REQUEST_DEPTH',
  PEER_REQUEST_RECEIVED: 'PEER_REQUEST_RECEIVED',
  PEER_CONSENT_RESPONSE: 'PEER_CONSENT_RESPONSE',
  RESPOND_TO_CONSENT: 'RESPOND_TO_CONSENT',
  REVOKE_CONSENT: 'REVOKE_CONSENT',
  MODEL_LOAD_START: 'MODEL_LOAD_START',
  MODEL_LOAD_SUCCESS: 'MODEL_LOAD_SUCCESS',
  MODEL_LOAD_ERROR: 'MODEL_LOAD_ERROR',
  TOGGLE_DEPTH: 'TOGGLE_DEPTH',
  RESET: 'RESET'
};

export const initialDepthContext = {
  viewerState: VIEWER_STATES.DISABLED,
  consentState: CONSENT_STATES.IDLE,
  promptRequesterName: '',
  note: ''
};

export const depthMachine = createMachine({
  id: 'depthConsentPipeline',
  initial: 'READY',
  context: initialDepthContext,
  states: {
    READY: {
      on: {
        [DEPTH_EVENTS.STREAM_CONNECTED]: {
          target: 'READY',
          actions: (ctx) => ({
            ...ctx,
            viewerState: ctx.viewerState === VIEWER_STATES.DISABLED ? VIEWER_STATES.IDLE : ctx.viewerState
          })
        },
        [DEPTH_EVENTS.STREAM_DISCONNECTED]: {
          target: 'READY',
          actions: (ctx) => ({
            ...ctx,
            viewerState: VIEWER_STATES.DISABLED,
            consentState: CONSENT_STATES.IDLE,
            promptRequesterName: '',
            note: ''
          })
        },
        [DEPTH_EVENTS.REQUEST_DEPTH]: [
          {
            guard: (ctx) => ctx.viewerState === VIEWER_STATES.PAUSED,
            target: 'READY',
            actions: (ctx) => ({
              ...ctx,
              viewerState: VIEWER_STATES.ACTIVE,
              note: 'Depth view is running locally on your device.'
            })
          },
          {
            guard: (ctx) => ctx.viewerState === VIEWER_STATES.ACTIVE,
            target: 'READY',
            actions: (ctx) => ({
              ...ctx,
              viewerState: VIEWER_STATES.PAUSED,
              note: 'Depth view turned off.'
            })
          },
          {
            guard: (ctx) =>
              ctx.viewerState === VIEWER_STATES.IDLE ||
              ctx.viewerState === VIEWER_STATES.DECLINED ||
              ctx.viewerState === VIEWER_STATES.REVOKED ||
              ctx.viewerState === VIEWER_STATES.ERROR,
            target: 'READY',
            actions: (ctx) => ({
              ...ctx,
              viewerState: VIEWER_STATES.REQUESTING,
              note: 'Waiting for permission. If approved, the first use downloads a ~27 MB model plus runtime files.'
            })
          }
        ],
        [DEPTH_EVENTS.PEER_REQUEST_RECEIVED]: {
          target: 'READY',
          actions: (ctx, evt) => ({
            ...ctx,
            consentState: CONSENT_STATES.PROMPTED,
            promptRequesterName: evt?.name || 'Your connection'
          })
        },
        [DEPTH_EVENTS.RESPOND_TO_CONSENT]: [
          {
            guard: (_, evt) => Boolean(evt?.allow),
            target: 'READY',
            actions: (ctx) => ({
              ...ctx,
              consentState: CONSENT_STATES.GRANTED,
              promptRequesterName: '',
              note: 'You approved on-device depth processing of your video. You can revoke access at any time.'
            })
          },
          {
            target: 'READY',
            actions: (ctx) => ({
              ...ctx,
              consentState: CONSENT_STATES.IDLE,
              promptRequesterName: ''
            })
          }
        ],
        [DEPTH_EVENTS.REVOKE_CONSENT]: {
          target: 'READY',
          actions: (ctx) => ({
            ...ctx,
            consentState: CONSENT_STATES.IDLE,
            promptRequesterName: '',
            note: 'You stopped allowing depth processing of your video.'
          })
        },
        [DEPTH_EVENTS.PEER_CONSENT_RESPONSE]: [
          {
            guard: (_, evt) => Boolean(evt?.revoked),
            target: 'READY',
            actions: (ctx) => ({
              ...ctx,
              viewerState: VIEWER_STATES.REVOKED,
              note: 'The other person revoked depth processing. It has stopped.'
            })
          },
          {
            guard: (_, evt) => Boolean(evt?.allowed),
            target: 'READY',
            actions: (ctx) => ({
              ...ctx,
              viewerState: VIEWER_STATES.APPROVED,
              note: 'Depth view approved. The optional model is loading on this device.'
            })
          },
          {
            target: 'READY',
            actions: (ctx) => ({
              ...ctx,
              viewerState: VIEWER_STATES.DECLINED,
              note: 'The other person declined depth processing. Your call continues normally.'
            })
          }
        ],
        [DEPTH_EVENTS.MODEL_LOAD_START]: {
          target: 'READY',
          actions: (ctx) => ({
            ...ctx,
            viewerState: VIEWER_STATES.LOADING_MODEL,
            note: 'Loading the on-device depth model…'
          })
        },
        [DEPTH_EVENTS.MODEL_LOAD_SUCCESS]: {
          target: 'READY',
          actions: (ctx) => ({
            ...ctx,
            viewerState: VIEWER_STATES.ACTIVE,
            note: 'Depth map is estimated on this device. Video frames are not uploaded for AI processing.'
          })
        },
        [DEPTH_EVENTS.MODEL_LOAD_ERROR]: {
          target: 'READY',
          actions: (ctx) => ({
            ...ctx,
            viewerState: VIEWER_STATES.ERROR,
            note: 'Depth estimation could not start on this device. The call continues normally.'
          })
        },
        [DEPTH_EVENTS.TOGGLE_DEPTH]: [
          {
            guard: (ctx) => ctx.viewerState === VIEWER_STATES.ACTIVE,
            target: 'READY',
            actions: (ctx) => ({
              ...ctx,
              viewerState: VIEWER_STATES.PAUSED,
              note: 'Depth view turned off.'
            })
          },
          {
            guard: (ctx) => ctx.viewerState === VIEWER_STATES.PAUSED,
            target: 'READY',
            actions: (ctx) => ({
              ...ctx,
              viewerState: VIEWER_STATES.ACTIVE,
              note: 'Depth view is running locally on your device.'
            })
          }
        ],
        [DEPTH_EVENTS.RESET]: {
          target: 'READY',
          actions: () => ({ ...initialDepthContext })
        }
      }
    }
  }
});
