import { Routes } from '@angular/router';
import { AuthComponent } from './features/auth/auth.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import {RECIPE_ROUTES} from './features/recipes/recipes.routes';

export const routes: Routes = [
  // Ekran Logowania / Rejestracji (Publiczny)
  {
    path: 'auth',
    component: AuthComponent
  },

  // Chroniona część aplikacji
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'planner',
        loadComponent: () =>
          import('./features/planner/planner.component').then(m => m.PlannerComponent)
      },
      {
        path: 'recipes',
        loadChildren: () => import('./features/recipes/recipes.routes').then(m => RECIPE_ROUTES)
      },
      {
        path: 'shopping-list', // <-- ZMIENIONE: 'shopping' -> 'shopping-list'
        loadComponent: () =>
          import('./features/shopping/shopping.component').then(m => m.ShoppingComponent)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },

  // Przekierowanie nieznanych ścieżek do dashboardu (jeśli zalogowany) lub auth
  { path: '**', redirectTo: 'dashboard' }
];
