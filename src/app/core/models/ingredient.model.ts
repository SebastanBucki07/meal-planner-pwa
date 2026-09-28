import { MacroNutrients } from './macro-nutrients.model';

export interface IngredientCategory {
  idx?: number;
  id: number;
  name: string;
  shop_order: number;
}

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  { idx: 0, id: 1, name: 'Pieczywo', shop_order: 0 },
  { idx: 1, id: 2, name: 'Warzywa', shop_order: 0 },
  { idx: 2, id: 3, name: 'Owoce', shop_order: 0 },
  { idx: 3, id: 4, name: 'Nabiał', shop_order: 0 },
  { idx: 4, id: 5, name: 'Mięso i Ryby', shop_order: 0 },
  { idx: 5, id: 6, name: 'Mrożonki', shop_order: 0 },
  { idx: 6, id: 7, name: 'Ryże, Kasze, Makarony', shop_order: 0 },
  { idx: 7, id: 8, name: 'Konserwy', shop_order: 0 },
  { idx: 8, id: 9, name: 'Przyprawy', shop_order: 0 },
  { idx: 9, id: 10, name: 'Inne', shop_order: 0 }
];

export interface IngredientGroup {
  category: IngredientCategory;
  items: Ingredient[];
}

// Model DTO dla tabeli `new_ingredients`
export interface NewIngredientDTO {
  id?: string;
  name: string;
  category_id?: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  default_unit?: string;
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
  categoryId: number;
  defaultUnitId: string; // <-- UUID z tabeli new_units
  macrosPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Model Domenowy Składnika przypisanego do przepisu
export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  name: string;
  amountInGrams: number;
  macros: MacroNutrients;
}
