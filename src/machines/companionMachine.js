import { createMachine } from './createMachine.js';

export const COMPANION_STATES = {
  IDLE: 'IDLE',
  ACTIVE: 'ACTIVE',
  POST_CALL: 'POST_CALL'
};

export const COMPANION_EVENTS = {
  START: 'START',
  TICK: 'TICK',
  FINISH: 'FINISH',
  DISMISS: 'DISMISS'
};

export const initialCompanionContext = {
  person: null,
  meetUrl: '',
  elapsed: 0,
  startedAt: null,
  endedAt: null
};

export const companionMachine = createMachine({
  id: 'companionMachine',
  initial: COMPANION_STATES.IDLE,
  context: initialCompanionContext,
  states: {
    [COMPANION_STATES.IDLE]: {
      on: {
        [COMPANION_EVENTS.START]: {
          target: COMPANION_STATES.ACTIVE,
          actions: (ctx, evt) => ({
            person: evt.person || { name: 'A connection' },
            meetUrl: evt.meetUrl || 'https://meet.google.com/new',
            elapsed: 0,
            startedAt: Date.now(),
            endedAt: null
          })
        }
      }
    },
    [COMPANION_STATES.ACTIVE]: {
      on: {
        [COMPANION_EVENTS.TICK]: {
          target: COMPANION_STATES.ACTIVE,
          actions: (ctx) => ({
            ...ctx,
            elapsed: ctx.elapsed + 1
          })
        },
        [COMPANION_EVENTS.FINISH]: {
          target: COMPANION_STATES.POST_CALL,
          actions: (ctx) => ({
            ...ctx,
            endedAt: Date.now()
          })
        },
        [COMPANION_EVENTS.DISMISS]: {
          target: COMPANION_STATES.IDLE,
          actions: () => initialCompanionContext
        }
      }
    },
    [COMPANION_STATES.POST_CALL]: {
      on: {
        [COMPANION_EVENTS.DISMISS]: {
          target: COMPANION_STATES.IDLE,
          actions: () => initialCompanionContext
        },
        [COMPANION_EVENTS.START]: {
          target: COMPANION_STATES.ACTIVE,
          actions: (ctx, evt) => ({
            person: evt.person || { name: 'A connection' },
            meetUrl: evt.meetUrl || 'https://meet.google.com/new',
            elapsed: 0,
            startedAt: Date.now(),
            endedAt: null
          })
        }
      }
    }
  }
});

export function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function getCompanionView(state) {
  const ctx = state.context;
  const isIdle = state.matches(COMPANION_STATES.IDLE);
  const isActive = state.matches(COMPANION_STATES.ACTIVE);
  const isPostCall = state.matches(COMPANION_STATES.POST_CALL);

  const personName = ctx.person?.name && ctx.person.name !== 'A connection'
    ? ctx.person.name
    : 'your connection';

  return {
    state: state.value,
    isIdle,
    isActive,
    isPostCall,
    person: ctx.person,
    personName,
    meetUrl: ctx.meetUrl,
    elapsed: ctx.elapsed,
    formattedElapsed: formatElapsed(ctx.elapsed),
    startedAt: ctx.startedAt,
    endedAt: ctx.endedAt
  };
}
