import { Routes } from '@angular/router';
import { authGuard } from './core/guards/authGuard';
import { noAuthGuard } from './core/guards/noAuthGuard';
import { adminGuard } from './core/guards/adminGuard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/login/loginPage/loginPage').then(({ LoginPage }) => LoginPage),
  },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboardPage/dashboardPage').then(
        ({ DashboardPage }) => DashboardPage,
      ),
  },

  {
    path: 'leads',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/leads/lead-list/lead-listComponent').then(
        ({ LeadListComponent }) => LeadListComponent,
      ),
  },

  {
    path: 'leads/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/leads/lead-form/lead-formComponent').then(
        ({ LeadFormComponent }) => LeadFormComponent,
      ),
  },

  {
    path: 'leads/edit/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/leads/lead-form/lead-formComponent').then(
        ({ LeadFormComponent }) => LeadFormComponent,
      ),
  },

  {
    path: 'leads/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/leads/lead-detail/lead-detailComponent').then(
        ({ LeadDetailComponent }) => LeadDetailComponent,
      ),
  },

  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/history/historyPage/historyPage').then(({ HistoryPage }) => HistoryPage),
  },

  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/adminManagementPage/adminManagementPage').then(
        ({ AdminManagementPage }) => AdminManagementPage,
      ),
  },

  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profilePage/profilePage').then(({ ProfilePage }) => ProfilePage),
  },

  { path: '**', redirectTo: '/login' },
];
