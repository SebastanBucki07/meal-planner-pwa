import { NewRecipeDTO } from './recipe.model';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// Model DTO dla tabeli `new_meal_plans`
export interface NewMealPlanDTO {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  recipe_id: string | null;
  custom_name: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  completed: boolean;
  created_at: string;
  new_recipes?: NewRecipeDTO;
}

// Model Domenowy Posiłku w kalendarzu/dashboardzie
export interface MealEntry {
  id: string;
  date: string;
  mealType: MealType;
  recipeId?: string;
  title: string;
  imageUrl?: string;
  servings: number;
  completed: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
