/**
 * @file breathingMachine.js
 * Explicit Finite State Machine for the guided breathing pause.
 * Replaces implicit arithmetic and flags with clear, deterministic states
 * and supports custom durations (60s, 120s, 180s).
 */

import { createMachine } from './createMachine.js';

export const BREATHING_STATES = {
  IDLE: 'IDLE',
  INHALING: 'INHALING',
  HOLDING: 'HOLDING',
  EXHALING: 'EXHALING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED'
};

export const BREATHING_EVENTS = {
  TOGGLE: 'TOGGLE',
  TICK: 'TICK',
  RESET: 'RESET',
  SET_DURATION: 'SET_DURATION'
};

const CYCLE_LENGTH = 14;
const INHALE_DURATION = 4;
const HOLD_DURATION = 2; // Inhale (0..4), Hold (4..6), Exhale (6..14)

function getCyclePhase(secondsLeft, totalSeconds = 60) {
  const elapsed = totalSeconds - secondsLeft;
  const cycleIndex = ((elapsed % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  if (cycleIndex < INHALE_DURATION) return BREATHING_STATES.INHALING;
  if (cycleIndex < INHALE_DURATION + HOLD_DURATION) return BREATHING_STATES.HOLDING;
  return BREATHING_STATES.EXHALING;
}

export const breathingMachine = createMachine({
  id: 'breathingPause',
  initial: BREATHING_STATES.IDLE,
  context: {
    seconds: 60,
    totalSeconds: 60
  },
  states: {
    [BREATHING_STATES.IDLE]: {
      on: {
        [BREATHING_EVENTS.TOGGLE]: {
          target: BREATHING_STATES.INHALING,
          actions: (ctx) => ({ ...ctx, seconds: ctx.totalSeconds || 60 })
        },
        [BREATHING_EVENTS.SET_DURATION]: {
          target: BREATHING_STATES.IDLE,
          actions: (ctx, evt) => {
            const dur = Number(evt?.duration) || 60;
            return { ...ctx, seconds: dur, totalSeconds: dur };
          }
        },
        [BREATHING_EVENTS.RESET]: {
          target: BREATHING_STATES.IDLE,
          actions: (ctx) => ({ ...ctx, seconds: ctx.totalSeconds || 60 })
        }
      }
    },
    [BREATHING_STATES.INHALING]: {
      on: {
        [BREATHING_EVENTS.TOGGLE]: BREATHING_STATES.PAUSED,
        [BREATHING_EVENTS.RESET]: {
          target: BREATHING_STATES.IDLE,
          actions: (ctx) => ({ ...ctx, seconds: ctx.totalSeconds || 60 })
        },
        [BREATHING_EVENTS.TICK]: [
          {
            guard: (ctx) => ctx.seconds <= 1,
            target: BREATHING_STATES.COMPLETED,
            actions: (ctx) => ({ ...ctx, seconds: 0 })
          },
          {
            guard: (ctx) => getCyclePhase(ctx.seconds - 1, ctx.totalSeconds) !== BREATHING_STATES.INHALING,
            target: BREATHING_STATES.HOLDING,
            actions: (ctx) => ({ ...ctx, seconds: ctx.seconds - 1 })
          },
          {
            actions: (ctx) => ({ ...ctx, seconds: ctx.seconds - 1 })
          }
        ]
      }
    },
    [BREATHING_STATES.HOLDING]: {
      on: {
        [BREATHING_EVENTS.TOGGLE]: BREATHING_STATES.PAUSED,
        [BREATHING_EVENTS.RESET]: {
          target: BREATHING_STATES.IDLE,
          actions: (ctx) => ({ ...ctx, seconds: ctx.totalSeconds || 60 })
        },
        [BREATHING_EVENTS.TICK]: [
          {
            guard: (ctx) => ctx.seconds <= 1,
            target: BREATHING_STATES.COMPLETED,
            actions: (ctx) => ({ ...ctx, seconds: 0 })
          },
          {
            guard: (ctx) => getCyclePhase(ctx.seconds - 1, ctx.totalSeconds) !== BREATHING_STATES.HOLDING,
            target: BREATHING_STATES.EXHALING,
            actions: (ctx) => ({ ...ctx, seconds: ctx.seconds - 1 })
          },
          {
            actions: (ctx) => ({ ...ctx, seconds: ctx.seconds - 1 })
          }
        ]
      }
    },
    [BREATHING_STATES.EXHALING]: {
      on: {
        [BREATHING_EVENTS.TOGGLE]: BREATHING_STATES.PAUSED,
        [BREATHING_EVENTS.RESET]: {
          target: BREATHING_STATES.IDLE,
          actions: (ctx) => ({ ...ctx, seconds: ctx.totalSeconds || 60 })
        },
        [BREATHING_EVENTS.TICK]: [
          {
            guard: (ctx) => ctx.seconds <= 1,
            target: BREATHING_STATES.COMPLETED,
            actions: (ctx) => ({ ...ctx, seconds: 0 })
          },
          {
            guard: (ctx) => getCyclePhase(ctx.seconds - 1, ctx.totalSeconds) === BREATHING_STATES.INHALING,
            target: BREATHING_STATES.INHALING,
            actions: (ctx) => ({ ...ctx, seconds: ctx.seconds - 1 })
          },
          {
            actions: (ctx) => ({ ...ctx, seconds: ctx.seconds - 1 })
          }
        ]
      }
    },
    [BREATHING_STATES.PAUSED]: {
      on: {
        [BREATHING_EVENTS.TOGGLE]: [
          {
            guard: (ctx) => getCyclePhase(ctx.seconds, ctx.totalSeconds) === BREATHING_STATES.INHALING,
            target: BREATHING_STATES.INHALING
          },
          {
            guard: (ctx) => getCyclePhase(ctx.seconds, ctx.totalSeconds) === BREATHING_STATES.HOLDING,
            target: BREATHING_STATES.HOLDING
          },
          {
            target: BREATHING_STATES.EXHALING
          }
        ],
        [BREATHING_EVENTS.RESET]: {
          target: BREATHING_STATES.IDLE,
          actions: (ctx) => ({ ...ctx, seconds: ctx.totalSeconds || 60 })
        }
      }
    },
    [BREATHING_STATES.COMPLETED]: {
      on: {
        [BREATHING_EVENTS.TOGGLE]: {
          target: BREATHING_STATES.IDLE,
          actions: (ctx) => ({ ...ctx, seconds: ctx.totalSeconds || 60 })
        },
        [BREATHING_EVENTS.RESET]: {
          target: BREATHING_STATES.IDLE,
          actions: (ctx) => ({ ...ctx, seconds: ctx.totalSeconds || 60 })
        }
      }
    }
  }
});

/**
 * Returns accessible display info and labels for the current breathing state.
 */
export function getBreathingView(state) {
  const { value, context } = state;
  const { seconds, totalSeconds = 60 } = context;

  switch (value) {
    case BREATHING_STATES.INHALING:
      return {
        label: 'Breathe in gently',
        buttonLabel: 'Pause',
        isActive: true,
        isCompleted: false,
        headline: 'Come back to this moment.',
        seconds,
        totalSeconds
      };
    case BREATHING_STATES.HOLDING:
      return {
        label: 'Rest softly',
        buttonLabel: 'Pause',
        isActive: true,
        isCompleted: false,
        headline: 'Come back to this moment.',
        seconds,
        totalSeconds
      };
    case BREATHING_STATES.EXHALING:
      return {
        label: 'Breathe out slowly',
        buttonLabel: 'Pause',
        isActive: true,
        isCompleted: false,
        headline: 'Come back to this moment.',
        seconds,
        totalSeconds
      };
    case BREATHING_STATES.PAUSED:
      return {
        label: 'Paused · Rest here',
        buttonLabel: 'Continue',
        isActive: false,
        isCompleted: false,
        headline: 'Come back to this moment.',
        seconds,
        totalSeconds
      };
    case BREATHING_STATES.COMPLETED:
      return {
        label: 'Pause complete',
        buttonLabel: 'Start again',
        isActive: false,
        isCompleted: true,
        headline: 'You made a little room.',
        seconds: 0,
        totalSeconds
      };
    case BREATHING_STATES.IDLE:
    default:
      return {
        label: 'Ready when you are',
        buttonLabel: 'Begin a quiet pause',
        isActive: false,
        isCompleted: false,
        headline: 'Come back to this moment.',
        seconds: totalSeconds,
        totalSeconds
      };
  }
}
