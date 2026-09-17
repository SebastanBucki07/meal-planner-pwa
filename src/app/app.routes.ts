import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import {MealPlanComponent} from './components/meal-plan/meal-plan.component';
import {RecipesComponent} from './recipes/recipes.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'plan', component: MealPlanComponent, canActivate: [authGuard] },
  { path: 'recipes', component: RecipesComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' }
];
