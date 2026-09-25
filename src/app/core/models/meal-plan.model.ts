import {NewRecipeDTO, Recipe} from './recipe.model';

export type MealType = 'Śniadanie' | 'II Śniadanie' | 'Obiad' | 'Kolacja' | 'Przekąska';

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

export interface MealPlan {
  id: string;
  userId: string;
  date: string;
  mealType: MealType;
  recipeId: string | null;
  recipe?: Recipe;
  customName: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  completed: boolean;
}
