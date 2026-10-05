import { useCallback, useEffect, useState } from 'react';
import {
  connectWallet,
  getBalance,
  getConnectedAccount,
  watchAccount,
} from '../lib/wallet';

export interface WalletState {
  account: `0x${string}` | null;
  balanceWei: bigint | null;
  connecting: boolean;
  error: string;
  connect: () => Promise<`0x${string}` | null>;
  refreshBalance: () => void;
}

export function useWallet(): WalletState {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [balanceWei, setBalanceWei] = useState<bigint | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const loadBalance = useCallback((addr: `0x${string}` | null) => {
    if (!addr) {
      setBalanceWei(null);
      return;
    }
    getBalance(addr)
      .then(setBalanceWei)
      .catch(() => setBalanceWei(null));
  }, []);

  useEffect(() => {
    // Read existing accounts silently on mount (no prompt).
    getConnectedAccount()
      .then((addr) => {
        setAccount(addr);
        loadBalance(addr);
      })
      .catch(() => {});

    const unwatch = watchAccount((addr) => {
      setAccount(addr);
      loadBalance(addr);
    });
    return unwatch;
  }, [loadBalance]);

  const connect = useCallback(async () => {
    setError('');
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAccount(addr);
      loadBalance(addr);
      return addr;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setConnecting(false);
    }
  }, [loadBalance]);

  const refreshBalance = useCallback(() => loadBalance(account), [account, loadBalance]);

  return { account, balanceWei, connecting, error, connect, refreshBalance };
}
