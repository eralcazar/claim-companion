import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface ImpersonationState {
  actingAsPatientId: string | null;
  actingAsName: string | null;
}

interface ImpersonationContextType extends ImpersonationState {
  setActingAs: (patientId: string, name: string) => void;
  clearActingAs: () => void;
}

const STORAGE_KEY = "mediclaim:impersonation";

const ImpersonationContext = createContext<ImpersonationContextType>({
  actingAsPatientId: null,
  actingAsName: null,
  setActingAs: () => {},
  clearActingAs: () => {},
});

export const useImpersonation = () => useContext(ImpersonationContext);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { actingAsPatientId: null, actingAsName: null };
  });

  useEffect(() => {
    try {
      if (state.actingAsPatientId) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [state]);

  const setActingAs = (patientId: string, name: string) => {
    setState({ actingAsPatientId: patientId, actingAsName: name });
  };

  const clearActingAs = () => {
    setState({ actingAsPatientId: null, actingAsName: null });
  };

  return (
    <ImpersonationContext.Provider value={{ ...state, setActingAs, clearActingAs }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

/**
 * Returns the effective user id to use for queries/inserts:
 * - If a broker is impersonating a patient, returns the patient id
 * - Otherwise returns the broker's/user's own id
 */
export function useEffectiveUserId(ownUserId: string | undefined): string | undefined {
  const { actingAsPatientId } = useImpersonation();
  return actingAsPatientId ?? ownUserId;
}