import { NewRecipeIngredientDTO, RecipeIngredient } from './ingredient.model';

// Model DTO dla tabeli `new_recipes`
export interface NewRecipeDTO {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  image_url: string | null;
  video_url: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
  new_recipe_ingredients?: NewRecipeIngredientDTO[];
}

// Model Domenowy Przepisu
export interface Recipe {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  imageUrl?: string;
  videoUrl?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: RecipeIngredient[];
}
