/**
 * @file useMachine.js
 * React hook to bind finite state machines with zero runtime overhead,
 * full concurrent React 19 safety, and declarative event dispatch.
 */

import { useReducer, useCallback } from 'react';

/**
 * Hook to consume a finite state machine in React components.
 *
 * @template TContext
 * @param {Object} machine - Machine created with createMachine
 * @param {TContext|Function} [initialContext] - Optional context override
 * @returns {[Object, Function]} [state, send]
 */
export function useMachine(machine, initialContext) {
  const [state, dispatch] = useReducer(
    (current, event) => {
      const result = machine.transition(current.value, current.context, event);
      return result;
    },
    initialContext,
    (ctx) => machine.getInitialState(ctx)
  );

  const send = useCallback((event) => {
    const evt = typeof event === 'string' ? { type: event } : event;
    dispatch(evt);
  }, []);

  return [state, send];
}
