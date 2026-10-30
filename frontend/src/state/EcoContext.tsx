import { createContext, useContext, useMemo, useReducer, type Dispatch, type PropsWithChildren } from 'react';
import { ecoReducer, initialState, type EcoState } from './ecoReducer';
import type { EcoAction } from './actions';

const EcoCtx = createContext<{ state: EcoState; dispatch: Dispatch<EcoAction> } | null>(null);
export function EcoProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(ecoReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <EcoCtx.Provider value={value}>{children}</EcoCtx.Provider>;
}
export function useEco() {
  const value = useContext(EcoCtx);
  if (!value) throw new Error('useEco must be used within EcoProvider');
  return value;
}
