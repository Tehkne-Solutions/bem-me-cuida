import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { recordTechnicalEvent, type TechnicalEventContext, type TechnicalEventName } from '@/data/technical-event-repository';
import {
  defaultBetaOperationPreferences,
  readBetaOperationPreferences,
  saveBetaOperationPreferences,
  type BetaOperationPreferences,
} from '@/preferences/beta-operation-preferences';

type TechnicalObservabilityContextValue = {
  preferences: BetaOperationPreferences;
  loading: boolean;
  updatePreferences: (next: BetaOperationPreferences) => Promise<void>;
  record: (eventName: TechnicalEventName, context?: TechnicalEventContext) => Promise<void>;
  refresh: () => Promise<void>;
};

const TechnicalObservabilityContext = createContext<TechnicalObservabilityContextValue>({
  preferences: defaultBetaOperationPreferences,
  loading: true,
  updatePreferences: async () => undefined,
  record: async () => undefined,
  refresh: async () => undefined,
});

export function TechnicalObservabilityProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [preferences, setPreferences] = useState(defaultBetaOperationPreferences);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const sessionStartedFor = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setPreferences(defaultBetaOperationPreferences);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPreferences(await readBetaOperationPreferences(session.user.id));
    } finally {
      setLoading(false);
    }
  }, [session]);

  const updatePreferences = useCallback(async (next: BetaOperationPreferences) => {
    if (!session) return;
    await saveBetaOperationPreferences(session.user.id, next);
    setPreferences(next);
  }, [session]);

  const record = useCallback(async (
    eventName: TechnicalEventName,
    context: TechnicalEventContext = {},
  ) => {
    if (!session || !preferences.technicalLogEnabled) return;
    await recordTechnicalEvent(session.user.id, eventName, context);
  }, [preferences.technicalLogEnabled, session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!session || !preferences.technicalLogEnabled) return;
    if (sessionStartedFor.current === session.user.id) return;
    sessionStartedFor.current = session.user.id;
    void recordTechnicalEvent(session.user.id, 'app_session_started');
  }, [preferences.technicalLogEnabled, session]);

  useEffect(() => {
    if (!session) {
      sessionStartedFor.current = null;
      return;
    }
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previous = appState.current;
      appState.current = nextState;
      if (!preferences.technicalLogEnabled) return;
      if (nextState === 'background' && previous !== 'background') {
        void recordTechnicalEvent(session.user.id, 'app_backgrounded');
      }
      if (nextState === 'active' && previous !== 'active') {
        void recordTechnicalEvent(session.user.id, 'app_foregrounded');
      }
    });
    return () => subscription.remove();
  }, [preferences.technicalLogEnabled, session]);

  return (
    <TechnicalObservabilityContext.Provider value={{ preferences, loading, updatePreferences, record, refresh }}>
      {children}
    </TechnicalObservabilityContext.Provider>
  );
}

export function useTechnicalObservability(): TechnicalObservabilityContextValue {
  return useContext(TechnicalObservabilityContext);
}
