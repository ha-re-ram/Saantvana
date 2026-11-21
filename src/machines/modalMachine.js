import { createMachine } from './createMachine.js';

export const MODAL_STATES = {
  IDLE: 'IDLE',
  SETTINGS: 'SETTINGS',
  GUIDE: 'GUIDE',
  CRISIS: 'CRISIS',
  ADD_CONNECTION: 'ADD_CONNECTION',
  EDIT_CONNECTION: 'EDIT_CONNECTION',
  CALL_CHOICE: 'CALL_CHOICE'
};

export const MODAL_EVENTS = {
  OPEN_SETTINGS: 'OPEN_SETTINGS',
  OPEN_GUIDE: 'OPEN_GUIDE',
  OPEN_CRISIS: 'OPEN_CRISIS',
  OPEN_ADD_CONNECTION: 'OPEN_ADD_CONNECTION',
  OPEN_EDIT_CONNECTION: 'OPEN_EDIT_CONNECTION',
  OPEN_CALL_CHOICE: 'OPEN_CALL_CHOICE',
  CLOSE: 'CLOSE'
};

export const initialModalContext = {
  activeModal: MODAL_STATES.IDLE,
  targetPerson: null,
  previousModal: null
};

export const modalMachine = createMachine({
  id: 'modalMachine',
  initial: MODAL_STATES.IDLE,
  context: initialModalContext,
  states: {
    [MODAL_STATES.IDLE]: {
      on: {
        [MODAL_EVENTS.OPEN_SETTINGS]: {
          target: MODAL_STATES.SETTINGS,
          actions: (ctx) => ({ ...ctx, activeModal: MODAL_STATES.SETTINGS, previousModal: MODAL_STATES.IDLE })
        },
        [MODAL_EVENTS.OPEN_GUIDE]: {
          target: MODAL_STATES.GUIDE,
          actions: (ctx) => ({ ...ctx, activeModal: MODAL_STATES.GUIDE, previousModal: MODAL_STATES.IDLE })
        },
        [MODAL_EVENTS.OPEN_CRISIS]: {
          target: MODAL_STATES.CRISIS,
          actions: (ctx) => ({ ...ctx, activeModal: MODAL_STATES.CRISIS, previousModal: MODAL_STATES.IDLE })
        },
        [MODAL_EVENTS.OPEN_ADD_CONNECTION]: {
          target: MODAL_STATES.ADD_CONNECTION,
          actions: (ctx) => ({ ...ctx, activeModal: MODAL_STATES.ADD_CONNECTION, previousModal: MODAL_STATES.IDLE })
        },
        [MODAL_EVENTS.OPEN_EDIT_CONNECTION]: {
          target: MODAL_STATES.EDIT_CONNECTION,
          actions: (ctx, evt) => ({
            ...ctx,
            activeModal: MODAL_STATES.EDIT_CONNECTION,
            targetPerson: evt.contact || null,
            previousModal: MODAL_STATES.IDLE
          })
        },
        [MODAL_EVENTS.OPEN_CALL_CHOICE]: {
          target: MODAL_STATES.CALL_CHOICE,
          actions: (ctx, evt) => ({
            ...ctx,
            activeModal: MODAL_STATES.CALL_CHOICE,
            targetPerson: evt.person || null,
            previousModal: MODAL_STATES.IDLE
          })
        }
      }
    },
    [MODAL_STATES.SETTINGS]: {
      on: {
        [MODAL_EVENTS.CLOSE]: {
          target: MODAL_STATES.IDLE,
          actions: () => initialModalContext
        },
        [MODAL_EVENTS.OPEN_CRISIS]: {
          target: MODAL_STATES.CRISIS,
          actions: (ctx) => ({ ...ctx, activeModal: MODAL_STATES.CRISIS, previousModal: MODAL_STATES.SETTINGS })
        }
      }
    },
    [MODAL_STATES.GUIDE]: {
      on: {
        [MODAL_EVENTS.CLOSE]: {
          target: MODAL_STATES.IDLE,
          actions: () => initialModalContext
        },
        [MODAL_EVENTS.OPEN_CRISIS]: {
          target: MODAL_STATES.CRISIS,
          actions: (ctx) => ({ ...ctx, activeModal: MODAL_STATES.CRISIS, previousModal: MODAL_STATES.GUIDE })
        }
      }
    },
    [MODAL_STATES.CRISIS]: {
      on: {
        [MODAL_EVENTS.CLOSE]: {
          target: MODAL_STATES.IDLE,
          actions: () => initialModalContext
        }
      }
    },
    [MODAL_STATES.ADD_CONNECTION]: {
      on: {
        [MODAL_EVENTS.CLOSE]: {
          target: MODAL_STATES.IDLE,
          actions: () => initialModalContext
        }
      }
    },
    [MODAL_STATES.EDIT_CONNECTION]: {
      on: {
        [MODAL_EVENTS.CLOSE]: {
          target: MODAL_STATES.IDLE,
          actions: () => initialModalContext
        }
      }
    },
    [MODAL_STATES.CALL_CHOICE]: {
      on: {
        [MODAL_EVENTS.CLOSE]: {
          target: MODAL_STATES.IDLE,
          actions: () => initialModalContext
        }
      }
    }
  }
});
