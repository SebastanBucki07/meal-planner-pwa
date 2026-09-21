import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import {RecipesComponent} from './recipes/recipes.component';
import {AddRecipeComponent} from './recipes/add-recipe/add-recipe.component';
import {RecipeDetailsComponent} from './recipes/recipe-details/recipe-details.component';
import {ProfileComponent} from './components/profile/profile.component';
import {PlanComponent} from './components/plan/plan.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'recipes/add', component: AddRecipeComponent, canActivate: [authGuard] },
  { path: 'recipes/:id', component: RecipeDetailsComponent, canActivate: [authGuard] },
  { path: 'recipes', component: RecipesComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent },
  { path: 'plan', component: PlanComponent },

  { path: '**', redirectTo: 'dashboard' }
];
