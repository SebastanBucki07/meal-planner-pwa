import { Recipe } from './recipe.model';

export interface PlannedMeal {
  id: string;
  meal_type: string;
  recipe: Recipe;
}
