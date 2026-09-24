import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { RecipesComponent } from './recipes/recipes.component';
import { AddRecipeComponent } from './recipes/add-recipe/add-recipe.component';
import { RecipeDetailsComponent } from './recipes/recipe-details/recipe-details.component';
import { ProfileComponent } from './components/profile/profile.component';
import { PlanComponent } from './components/plan/plan.component';
import { ShoppingListComponent } from './components/shopping-list/shopping-list.component';
import { AddIngredientComponent } from './components/add-ingredient/add-ingredient.component';
import { MainComponent } from './main/main.component';

export const routes: Routes = [
  // 1. Ekran logowania / rejestracji (bez Headera i Footera)
  {
    path: 'auth',
    component: AuthComponent
  },

  // 2. Główny obszar aplikacji (z Headerem i Footerem w MainLayoutComponent)
  {
    path: '',
    component: MainComponent,
    canActivate: [authGuard], // Guard chroni teraz całą sekcję za jednym razem
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'recipes', component: RecipesComponent },
      { path: 'recipes/add', component: AddRecipeComponent },
      { path: 'recipes/:id', component: RecipeDetailsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'plan', component: PlanComponent },
      { path: 'shopping-list', component: ShoppingListComponent },
      { path: 'add-ingredient', component: AddIngredientComponent }
    ]
  },

  // 3. Fallback dla nieznanych adresów URL
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
