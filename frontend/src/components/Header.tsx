import { contractAddress, explorerAddress } from '../lib/config';
import { formatGen, shortAddress } from '../lib/format';
import { navigate } from '../hooks/useHashRoute';
import type { WalletState } from '../hooks/useWallet';

export function Header({ wallet }: { wallet: WalletState }) {
  const { account, balanceWei, connecting, connect } = wallet;
  const contractLink = explorerAddress(contractAddress);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a
          className="brand"
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          <span className="brand-mark" aria-hidden="true">◆</span>
          <span className="brand-name">DeadlineStake</span>
        </a>

        <nav className="header-nav">
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            Markets
          </a>
          <a
            className="nav-cta"
            href="#/new"
            onClick={(e) => {
              e.preventDefault();
              navigate('/new');
            }}
          >
            Open a market
          </a>
        </nav>

        <div className="header-right">
          {contractLink && (
            <a
              className="contract-link mono small"
              href={contractLink}
              target="_blank"
              rel="noreferrer noopener"
              title={contractAddress}
            >
              Contract {shortAddress(contractAddress)} ↗
            </a>
          )}
          {account ? (
            <div className="wallet-chip" title={account}>
              <span className="wallet-dot" aria-hidden="true" />
              <span className="mono">{shortAddress(account)}</span>
              {balanceWei !== null && (
                <span className="wallet-balance">{formatGen(balanceWei, 3)} GEN</span>
              )}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => connect()} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
