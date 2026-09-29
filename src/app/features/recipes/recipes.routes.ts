import { Routes } from '@angular/router';
import { RecipesComponent } from './recipes.component';
import { RecipeAddComponent } from './recipe-add/recipe-add.component';

export const RECIPE_ROUTES: Routes = [
  {
    path: '',
    component: RecipesComponent // Lista przepisów (domyślny widok pod /recipes)
  },
  {
    path: 'add',
    component: RecipeAddComponent // Formularz dodawania (/recipes/add)
  }
];
