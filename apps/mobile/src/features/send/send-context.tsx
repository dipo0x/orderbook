import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

type SendState = {
  to: string;
  lamports: bigint;
  fee: bigint;
  /** Set once the transaction has been sent. */
  signature: string | null;
  /** When it was sent, to show how long confirmation took. */
  sentAt: number | null;
};

type SendApi = SendState & {
  setDraft: (to: string, lamports: bigint) => void;
  setFee: (fee: bigint) => void;
  setSent: (signature: string) => void;
  reset: () => void;
};

const EMPTY: SendState = { to: '', lamports: 0n, fee: 0n, signature: null, sentAt: null };

const SendContext = createContext<SendApi | null>(null);

/** Holds the transfer being built while the Send, Review and Sent screens run. */
export function SendProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SendState>(EMPTY);

  const setDraft = useCallback((to: string, lamports: bigint) => {
    setState((prev) => ({ ...prev, to, lamports }));
  }, []);
  const setFee = useCallback((fee: bigint) => setState((prev) => ({ ...prev, fee })), []);
  const setSent = useCallback((signature: string) => {
    setState((prev) => ({ ...prev, signature, sentAt: Date.now() }));
  }, []);
  const reset = useCallback(() => setState(EMPTY), []);

  const value = useMemo(
    () => ({ ...state, setDraft, setFee, setSent, reset }),
    [state, setDraft, setFee, setSent, reset],
  );
  return <SendContext.Provider value={value}>{children}</SendContext.Provider>;
}

export function useSend(): SendApi {
  const value = useContext(SendContext);
  if (!value) throw new Error('useSend must be used inside SendProvider');
  return value;
}
