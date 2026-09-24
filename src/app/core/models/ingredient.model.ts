import { MacroNutrients } from './macro-nutrients.model';

// Model DTO dla tabeli `new_ingredients`
export interface NewIngredientDTO {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  default_unit: string;
}

// Model DTO dla tabeli łączącej `new_recipe_ingredients`
export interface NewRecipeIngredientDTO {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  amount_in_grams: number;
  new_ingredients?: NewIngredientDTO;
}

// Model Domenowy Składnika
export interface Ingredient {
  id: string;
  name: string;
  defaultUnit: string;
  macrosPer100g: MacroNutrients;
}

// Model Domenowy Składnika przypisanego do przepisu
export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  name: string;
  amountInGrams: number;
  macros: MacroNutrients;
}
