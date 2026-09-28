export interface DaySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DashboardMealItem {
  id: string;
  recipeId?: string | null; // <-- Dodaj tę właściwość
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string | null;
  completed: boolean;
  mealType?: string;
}

export interface MealLogDTO {
  id: string;
  user_id?: string;
  name?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  completed?: boolean;
}
