import { Header } from './components/Header';
import { useHashRoute, navigate } from './hooks/useHashRoute';
import { useWallet } from './hooks/useWallet';
import { HomePage } from './pages/HomePage';
import { NewMarketPage } from './pages/NewMarketPage';
import { MarketDetailPage } from './pages/MarketDetailPage';

export default function App() {
  const route = useHashRoute();
  const wallet = useWallet();

  return (
    <div className="app">
      <Header wallet={wallet} />

      {wallet.error && (
        <div className="global-alert">
          <div className="global-alert-inner">{wallet.error}</div>
        </div>
      )}

      <main>
        {route.name === 'home' && <HomePage />}
        {route.name === 'new' && <NewMarketPage wallet={wallet} />}
        {route.name === 'market' && <MarketDetailPage id={route.id} wallet={wallet} />}
        {route.name === 'not-found' && (
          <div className="page page-narrow">
            <h1 className="page-title">Not found</h1>
            <p className="page-lede">That page does not exist.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Back to markets
            </button>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span>
            DeadlineStake — self-resolving commitment markets on{' '}
            <a href="https://genlayer.com" target="_blank" rel="noreferrer noopener">
              GenLayer
            </a>
          </span>
          <span className="muted small">
            Validators read the live web and settle each market by consensus.
          </span>
        </div>
      </footer>
    </div>
  );
}
