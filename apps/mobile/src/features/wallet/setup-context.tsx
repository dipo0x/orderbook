import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

type Source = 'create' | 'import';

type SetupState = {
  mnemonic: string | null;
  source: Source | null;
  biometric: boolean;
};

type SetupApi = SetupState & {
  start: (source: Source, mnemonic: string) => void;
  setBiometric: (enabled: boolean) => void;
  reset: () => void;
};

const EMPTY: SetupState = { mnemonic: null, source: null, biometric: false };

const SetupContext = createContext<SetupApi | null>(null);

/**
 * Holds the recovery phrase in memory while the wallet setup screens run.
 * It is never put in route params, logs or storage until the user finishes setup.
 */
export function WalletSetupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SetupState>(EMPTY);

  const start = useCallback((source: Source, mnemonic: string) => {
    setState({ source, mnemonic, biometric: false });
  }, []);
  const setBiometric = useCallback((biometric: boolean) => {
    setState((prev) => ({ ...prev, biometric }));
  }, []);
  const reset = useCallback(() => setState(EMPTY), []);

  const value = useMemo(
    () => ({ ...state, start, setBiometric, reset }),
    [state, start, setBiometric, reset],
  );
  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>;
}

export function useWalletSetup(): SetupApi {
  const value = useContext(SetupContext);
  if (!value) throw new Error('useWalletSetup must be used inside WalletSetupProvider');
  return value;
}
