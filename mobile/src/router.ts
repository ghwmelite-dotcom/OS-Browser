type RouteHandler = (container: HTMLElement, params?: Record<string, string>) => void;

const routes = new Map<string, RouteHandler>();
let appContainer: HTMLElement;
let routerInitialized = false;
let boundHandleRoute: (() => void) | null = null;

export function registerRoute(path: string, handler: RouteHandler): void {
  routes.set(path, handler);
}

export function navigate(path: string): void {
  window.location.hash = '#' + path;
}

export function getCurrentPath(): string {
  return window.location.hash.slice(1) || '/';
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  // Try exact match first
  const handler = routes.get(hash);
  if (handler) {
    handler(appContainer);
    return;
  }
  // Try parameterized routes (e.g., /chat/:id)
  for (const [pattern, h] of routes) {
    if (pattern.includes(':')) {
      const parts = pattern.split('/');
      const hashParts = hash.split('/');
      if (parts.length === hashParts.length) {
        const params: Record<string, string> = {};
        let match = true;
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].startsWith(':')) params[parts[i].slice(1)] = hashParts[i];
          else if (parts[i] !== hashParts[i]) { match = false; break; }
        }
        if (match) { h(appContainer, params); return; }
      }
    }
  }
  // Default: redirect to home
  navigate('/');
}

export function initRouter(container: HTMLElement): void {
  appContainer = container;

  // Remove previous listener if re-initializing (e.g., after login)
  if (boundHandleRoute) {
    window.removeEventListener('hashchange', boundHandleRoute);
  }
  boundHandleRoute = handleRoute;

  window.addEventListener('hashchange', handleRoute);
  routerInitialized = true;

  // Always render the current route immediately
  handleRoute();
}
