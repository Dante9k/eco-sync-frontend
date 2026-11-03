import { createContext, useContext, useMemo, useReducer, type Dispatch, type PropsWithChildren } from 'react';
import { exoReducer, initialState, type ExoState } from './exoReducer';
import type { ExoAction } from './actions';

const ExoCtx = createContext<{ state: ExoState; dispatch: Dispatch<ExoAction> } | null>(null);
export function ExoProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(exoReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <ExoCtx.Provider value={value}>{children}</ExoCtx.Provider>;
}
export function useExo() {
  const value = useContext(ExoCtx);
  if (!value) throw new Error('useExo must be used within ExoProvider');
  return value;
}
