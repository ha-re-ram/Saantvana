/**
 * @file createMachine.js
 * A lightweight, zero-dependency, deterministic Finite State Machine (FSM) engine
 * Designed for robust user and developer experience.
 */

/**
 * Creates a finite state machine definition with predictable transitions,
 * guard conditions, and context updates.
 *
 * @param {Object} config
 * @param {string} config.id - Identifier for debugging and logging
 * @param {string} config.initial - Initial state name
 * @param {Object|Function} [config.context] - Initial extended state
 * @param {Object} config.states - State transition table
 * @returns {Object} Machine instance with transition, can, and inspect methods
 */
export function createMachine(config) {
  const { id = 'machine', initial, states } = config;

  if (!initial || !states || !states[initial]) {
    throw new Error(`[createMachine:${id}] Invalid initial state: "${initial}"`);
  }

  function getInitialContext(customContext) {
    const base = typeof config.context === 'function' ? config.context() : (config.context || {});
    return { ...base, ...customContext };
  }

  function resolveTransition(currentState, currentContext, event) {
    const eventType = typeof event === 'string' ? event : event?.type;
    if (!eventType) return null;

    const stateNode = states[currentState];
    if (!stateNode || !stateNode.on) return null;

    const transitionRule = stateNode.on[eventType];
    if (!transitionRule) return null;

    const rules = Array.isArray(transitionRule) ? transitionRule : [transitionRule];

    for (const rule of rules) {
      if (typeof rule === 'string') {
        return { target: rule, actions: null };
      }
      if (typeof rule === 'object' && rule !== null) {
        if (!rule.guard || rule.guard(currentContext, event)) {
          return {
            target: rule.target !== undefined ? rule.target : currentState,
            actions: rule.actions || null
          };
        }
      }
    }
    return null;
  }

  return {
    id,
    config,
    getInitialState(customContext) {
      const context = getInitialContext(customContext);
      return {
        value: initial,
        context,
        matches: (pattern) => initial === pattern,
        can: (event) => Boolean(resolveTransition(initial, context, event))
      };
    },
    transition(currentState, currentContext, event) {
      const rule = resolveTransition(currentState, currentContext, event);
      if (!rule) {
        return {
          value: currentState,
          context: currentContext,
          changed: false,
          matches: (pattern) => currentState === pattern,
          can: (evt) => Boolean(resolveTransition(currentState, currentContext, evt))
        };
      }

      let nextContext = currentContext;
      if (rule.actions) {
        if (typeof rule.actions === 'function') {
          nextContext = rule.actions(currentContext, event) || currentContext;
        } else if (Array.isArray(rule.actions)) {
          for (const act of rule.actions) {
            if (typeof act === 'function') {
              nextContext = act(nextContext, event) || nextContext;
            }
          }
        }
      }

      const nextState = rule.target;
      return {
        value: nextState,
        context: nextContext,
        changed: nextState !== currentState || nextContext !== currentContext,
        matches: (pattern) => nextState === pattern,
        can: (evt) => Boolean(resolveTransition(nextState, nextContext, evt))
      };
    },
    can(currentState, currentContext, event) {
      return Boolean(resolveTransition(currentState, currentContext, event));
    },
    matches(currentState, pattern) {
      return currentState === pattern;
    }
  };
}
