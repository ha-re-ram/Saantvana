/**
 * @file menuMachine.js
 * Explicit Finite State Machine for popovers, dropdown menus, and overlays.
 * Guarantees mutual exclusivity: at most one popover menu can be active at a time,
 * eliminating overlapping overlays and ghost menu states.
 */

import { createMachine } from './createMachine.js';

export const MENU_STATES = {
  CLOSED: 'CLOSED',
  NOTIFICATIONS: 'NOTIFICATIONS',
  WORKSPACE: 'WORKSPACE',
  QUICK_ACTIONS: 'QUICK_ACTIONS'
};

export const MENU_EVENTS = {
  OPEN_NOTIFICATIONS: 'OPEN_NOTIFICATIONS',
  OPEN_WORKSPACE: 'OPEN_WORKSPACE',
  OPEN_QUICK_ACTIONS: 'OPEN_QUICK_ACTIONS',
  TOGGLE_NOTIFICATIONS: 'TOGGLE_NOTIFICATIONS',
  TOGGLE_WORKSPACE: 'TOGGLE_WORKSPACE',
  TOGGLE_QUICK_ACTIONS: 'TOGGLE_QUICK_ACTIONS',
  CLOSE: 'CLOSE'
};

export const initialMenuContext = {
  activeMenu: null
};

export const menuMachine = createMachine({
  id: 'menuCoordination',
  initial: MENU_STATES.CLOSED,
  context: initialMenuContext,
  states: {
    [MENU_STATES.CLOSED]: {
      on: {
        [MENU_EVENTS.OPEN_NOTIFICATIONS]: {
          target: MENU_STATES.NOTIFICATIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.NOTIFICATIONS })
        },
        [MENU_EVENTS.TOGGLE_NOTIFICATIONS]: {
          target: MENU_STATES.NOTIFICATIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.NOTIFICATIONS })
        },
        [MENU_EVENTS.OPEN_WORKSPACE]: {
          target: MENU_STATES.WORKSPACE,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.WORKSPACE })
        },
        [MENU_EVENTS.TOGGLE_WORKSPACE]: {
          target: MENU_STATES.WORKSPACE,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.WORKSPACE })
        },
        [MENU_EVENTS.OPEN_QUICK_ACTIONS]: {
          target: MENU_STATES.QUICK_ACTIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.QUICK_ACTIONS })
        },
        [MENU_EVENTS.TOGGLE_QUICK_ACTIONS]: {
          target: MENU_STATES.QUICK_ACTIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.QUICK_ACTIONS })
        },
        [MENU_EVENTS.CLOSE]: MENU_STATES.CLOSED
      }
    },
    [MENU_STATES.NOTIFICATIONS]: {
      on: {
        [MENU_EVENTS.TOGGLE_NOTIFICATIONS]: {
          target: MENU_STATES.CLOSED,
          actions: (ctx) => ({ ...ctx, activeMenu: null })
        },
        [MENU_EVENTS.OPEN_WORKSPACE]: {
          target: MENU_STATES.WORKSPACE,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.WORKSPACE })
        },
        [MENU_EVENTS.TOGGLE_WORKSPACE]: {
          target: MENU_STATES.WORKSPACE,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.WORKSPACE })
        },
        [MENU_EVENTS.OPEN_QUICK_ACTIONS]: {
          target: MENU_STATES.QUICK_ACTIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.QUICK_ACTIONS })
        },
        [MENU_EVENTS.TOGGLE_QUICK_ACTIONS]: {
          target: MENU_STATES.QUICK_ACTIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.QUICK_ACTIONS })
        },
        [MENU_EVENTS.CLOSE]: {
          target: MENU_STATES.CLOSED,
          actions: (ctx) => ({ ...ctx, activeMenu: null })
        }
      }
    },
    [MENU_STATES.WORKSPACE]: {
      on: {
        [MENU_EVENTS.TOGGLE_WORKSPACE]: {
          target: MENU_STATES.CLOSED,
          actions: (ctx) => ({ ...ctx, activeMenu: null })
        },
        [MENU_EVENTS.OPEN_NOTIFICATIONS]: {
          target: MENU_STATES.NOTIFICATIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.NOTIFICATIONS })
        },
        [MENU_EVENTS.TOGGLE_NOTIFICATIONS]: {
          target: MENU_STATES.NOTIFICATIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.NOTIFICATIONS })
        },
        [MENU_EVENTS.OPEN_QUICK_ACTIONS]: {
          target: MENU_STATES.QUICK_ACTIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.QUICK_ACTIONS })
        },
        [MENU_EVENTS.TOGGLE_QUICK_ACTIONS]: {
          target: MENU_STATES.QUICK_ACTIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.QUICK_ACTIONS })
        },
        [MENU_EVENTS.CLOSE]: {
          target: MENU_STATES.CLOSED,
          actions: (ctx) => ({ ...ctx, activeMenu: null })
        }
      }
    },
    [MENU_STATES.QUICK_ACTIONS]: {
      on: {
        [MENU_EVENTS.TOGGLE_QUICK_ACTIONS]: {
          target: MENU_STATES.CLOSED,
          actions: (ctx) => ({ ...ctx, activeMenu: null })
        },
        [MENU_EVENTS.OPEN_NOTIFICATIONS]: {
          target: MENU_STATES.NOTIFICATIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.NOTIFICATIONS })
        },
        [MENU_EVENTS.TOGGLE_NOTIFICATIONS]: {
          target: MENU_STATES.NOTIFICATIONS,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.NOTIFICATIONS })
        },
        [MENU_EVENTS.OPEN_WORKSPACE]: {
          target: MENU_STATES.WORKSPACE,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.WORKSPACE })
        },
        [MENU_EVENTS.TOGGLE_WORKSPACE]: {
          target: MENU_STATES.WORKSPACE,
          actions: (ctx) => ({ ...ctx, activeMenu: MENU_STATES.WORKSPACE })
        },
        [MENU_EVENTS.CLOSE]: {
          target: MENU_STATES.CLOSED,
          actions: (ctx) => ({ ...ctx, activeMenu: null })
        }
      }
    }
  }
});
