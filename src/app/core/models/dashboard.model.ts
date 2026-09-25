export interface DaySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DashboardMealItem {
  id: string;
  name: string;
  calories: number;
  protein: number;      // <-- nowość
  carbs: number;        // <-- nowość
  fat: number;          // <-- nowość
  imageUrl?: string;    // <-- nowość
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
