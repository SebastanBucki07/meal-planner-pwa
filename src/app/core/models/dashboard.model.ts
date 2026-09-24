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
  completed: boolean;
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
