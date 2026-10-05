import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'market'; id: string }
  | { name: 'not-found' };

function parse(hash: string): Route {
  const clean = hash.replace(/^#/, '');
  if (clean === '' || clean === '/') return { name: 'home' };
  if (clean === '/new') return { name: 'new' };
  const market = clean.match(/^\/market\/([^/]+)$/);
  if (market) return { name: 'market', id: decodeURIComponent(market[1]) };
  return { name: 'not-found' };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string): void {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash === target) {
    // Force a re-read even when navigating to the current hash.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
  window.scrollTo(0, 0);
}
