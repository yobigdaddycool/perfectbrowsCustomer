import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), title: 'Register'  },
  { path: 'search', loadComponent: () => import('./pages/search/search.component').then(m => m.SearchComponent), title: 'Search' },
  { path: 'scan', loadComponent: () => import('./pages/scan/scan.component').then(m => m.ScanComponent), title: 'QR Scanner' },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), title: 'Register' },
  { path: 'register/:id', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), title: 'Edit Customer' },
  { path: '**', redirectTo: '' }
];
