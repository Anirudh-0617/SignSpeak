import { createBrowserRouter } from 'react-router-dom';
import { RouteFallback } from './ui/RouteFallback';

// All routes lazy — each chunk downloads only when its route is visited.
export const router = createBrowserRouter([
  {
    path: '/',
    HydrateFallback: RouteFallback,
    lazy: async () => ({ Component: (await import('./landing/Landing')).default }),
  },
  {
    path: '/login',
    HydrateFallback: RouteFallback,
    lazy: async () => ({ Component: (await import('./auth/Login')).default }),
  },
  {
    path: '/app',
    HydrateFallback: RouteFallback,
    lazy: async () => ({ Component: (await import('./App')).default }),
  },
]);
