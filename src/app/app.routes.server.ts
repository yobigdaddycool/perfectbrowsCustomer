import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'register/:id',
    renderMode: RenderMode.Server // Use SSR for dynamic routes, not prerendering
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
