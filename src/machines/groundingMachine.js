import { createMachine } from './createMachine.js';

export const GROUNDING_STATES = {
  IDLE: 'IDLE',
  SEE: 'SEE',
  TOUCH: 'TOUCH',
  HEAR: 'HEAR',
  SCENT: 'SCENT',
  APPRECIATE: 'APPRECIATE',
  COMPLETED: 'COMPLETED'
};

export const GROUNDING_EVENTS = {
  START: 'START',
  NEXT: 'NEXT',
  PREV: 'PREV',
  RESET: 'RESET',
  JUMP_TO: 'JUMP_TO'
};

export const initialGroundingContext = {
  step: 0,
  completedCount: 0
};

export const groundingMachine = createMachine({
  id: 'groundingMachine',
  initial: GROUNDING_STATES.IDLE,
  context: initialGroundingContext,
  states: {
    [GROUNDING_STATES.IDLE]: {
      on: {
        [GROUNDING_EVENTS.START]: {
          target: GROUNDING_STATES.SEE,
          actions: (ctx) => ({ ...ctx, step: 5, completedCount: 0 })
        },
        [GROUNDING_EVENTS.JUMP_TO]: {
          target: GROUNDING_STATES.SEE,
          actions: (ctx, evt) => ({ ...ctx, step: evt.step || 5 })
        }
      }
    },
    [GROUNDING_STATES.SEE]: {
      on: {
        [GROUNDING_EVENTS.NEXT]: {
          target: GROUNDING_STATES.TOUCH,
          actions: (ctx) => ({ ...ctx, step: 4, completedCount: 1 })
        },
        [GROUNDING_EVENTS.RESET]: {
          target: GROUNDING_STATES.IDLE,
          actions: () => initialGroundingContext
        }
      }
    },
    [GROUNDING_STATES.TOUCH]: {
      on: {
        [GROUNDING_EVENTS.NEXT]: {
          target: GROUNDING_STATES.HEAR,
          actions: (ctx) => ({ ...ctx, step: 3, completedCount: 2 })
        },
        [GROUNDING_EVENTS.PREV]: {
          target: GROUNDING_STATES.SEE,
          actions: (ctx) => ({ ...ctx, step: 5, completedCount: 0 })
        },
        [GROUNDING_EVENTS.RESET]: {
          target: GROUNDING_STATES.IDLE,
          actions: () => initialGroundingContext
        }
      }
    },
    [GROUNDING_STATES.HEAR]: {
      on: {
        [GROUNDING_EVENTS.NEXT]: {
          target: GROUNDING_STATES.SCENT,
          actions: (ctx) => ({ ...ctx, step: 2, completedCount: 3 })
        },
        [GROUNDING_EVENTS.PREV]: {
          target: GROUNDING_STATES.TOUCH,
          actions: (ctx) => ({ ...ctx, step: 4, completedCount: 1 })
        },
        [GROUNDING_EVENTS.RESET]: {
          target: GROUNDING_STATES.IDLE,
          actions: () => initialGroundingContext
        }
      }
    },
    [GROUNDING_STATES.SCENT]: {
      on: {
        [GROUNDING_EVENTS.NEXT]: {
          target: GROUNDING_STATES.APPRECIATE,
          actions: (ctx) => ({ ...ctx, step: 1, completedCount: 4 })
        },
        [GROUNDING_EVENTS.PREV]: {
          target: GROUNDING_STATES.HEAR,
          actions: (ctx) => ({ ...ctx, step: 3, completedCount: 2 })
        },
        [GROUNDING_EVENTS.RESET]: {
          target: GROUNDING_STATES.IDLE,
          actions: () => initialGroundingContext
        }
      }
    },
    [GROUNDING_STATES.APPRECIATE]: {
      on: {
        [GROUNDING_EVENTS.NEXT]: {
          target: GROUNDING_STATES.COMPLETED,
          actions: (ctx) => ({ ...ctx, step: 0, completedCount: 5 })
        },
        [GROUNDING_EVENTS.PREV]: {
          target: GROUNDING_STATES.SCENT,
          actions: (ctx) => ({ ...ctx, step: 2, completedCount: 3 })
        },
        [GROUNDING_EVENTS.RESET]: {
          target: GROUNDING_STATES.IDLE,
          actions: () => initialGroundingContext
        }
      }
    },
    [GROUNDING_STATES.COMPLETED]: {
      on: {
        [GROUNDING_EVENTS.START]: {
          target: GROUNDING_STATES.SEE,
          actions: (ctx) => ({ ...ctx, step: 5, completedCount: 0 })
        },
        [GROUNDING_EVENTS.RESET]: {
          target: GROUNDING_STATES.IDLE,
          actions: () => initialGroundingContext
        }
      }
    }
  }
});

const STEP_DATA = {
  [GROUNDING_STATES.IDLE]: {
    stepNumber: 0,
    sense: 'Readiness',
    title: '5-4-3-2-1 Sensory Grounding',
    instruction: 'Gently anchor your thoughts by engaging your senses one at a time. Take whatever time you need.',
    buttonLabel: 'Begin sensory grounding',
    progress: 0,
    badge: '5 senses'
  },
  [GROUNDING_STATES.SEE]: {
    stepNumber: 5,
    sense: 'Sight',
    title: 'Notice 5 things you can see',
    instruction: 'Look around your space. Notice shapes, textures, light patterns, shadows, or small details you hadn’t noticed today.',
    buttonLabel: 'I’ve found 5 things ➔ Next',
    progress: 20,
    badge: 'Step 1 of 5'
  },
  [GROUNDING_STATES.TOUCH]: {
    stepNumber: 4,
    sense: 'Touch',
    title: 'Notice 4 things you can physically feel',
    instruction: 'Feel the contact of your feet on the ground, the texture of your clothing, the warmth of your hands, or the chair supporting you.',
    buttonLabel: 'I feel them ➔ Next',
    progress: 40,
    badge: 'Step 2 of 5'
  },
  [GROUNDING_STATES.HEAR]: {
    stepNumber: 3,
    sense: 'Hearing',
    title: 'Notice 3 subtle sounds',
    instruction: 'Listen beyond your immediate space. A fan whirring, distant outdoor sounds, the clock ticking, or the rhythm of your own breath.',
    buttonLabel: 'I hear them ➔ Next',
    progress: 60,
    badge: 'Step 3 of 5'
  },
  [GROUNDING_STATES.SCENT]: {
    stepNumber: 2,
    sense: 'Scent & Breath',
    title: 'Notice 2 scents or take 2 slow breaths',
    instruction: 'Notice any scent in the air around you, or simply take two gentle, deep breaths through your nose, letting your belly soften.',
    buttonLabel: 'Breathed gently ➔ Next',
    progress: 80,
    badge: 'Step 4 of 5'
  },
  [GROUNDING_STATES.APPRECIATE]: {
    stepNumber: 1,
    sense: 'Presence',
    title: 'Notice 1 kind thing right now',
    instruction: 'Acknowledge one kind thought about yourself, a cozy detail in this room, or simply that you gave yourself this moment to pause.',
    buttonLabel: 'Complete reset',
    progress: 95,
    badge: 'Final step'
  },
  [GROUNDING_STATES.COMPLETED]: {
    stepNumber: 0,
    sense: 'Grounded',
    title: 'Grounding complete · Welcome back',
    instruction: 'You’ve checked in with all five senses and returned to the present moment. Carry this calm presence into whatever is next.',
    buttonLabel: 'Start another grounding pause',
    progress: 100,
    badge: 'Complete'
  }
};

export function getGroundingView(state) {
  const data = STEP_DATA[state.value] || STEP_DATA[GROUNDING_STATES.IDLE];
  return {
    ...data,
    state: state.value,
    isActive: state.value !== GROUNDING_STATES.IDLE && state.value !== GROUNDING_STATES.COMPLETED,
    isCompleted: state.value === GROUNDING_STATES.COMPLETED,
    completedCount: state.context.completedCount
  };
}
