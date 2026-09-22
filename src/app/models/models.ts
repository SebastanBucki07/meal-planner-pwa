// --- Główne Modele Danych ---

export interface Recipe {
  id: string;
  title: string;
  image_url?: string;
  video_url?: string; // Dodane brakujące pole
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description?: string;
  instructions?: string;
  ingredients_list?: any[]; // Składniki wewnątrz przepisu
}

export interface PlannedMeal {
  id: string;
  meal_type: string;
  recipe: Recipe; // Zagnieżdżony obiekt przepisu
}

export interface ShoppingList {
  id: number;
  start_date: string;
  end_date: string;
  items: ShoppingListItem[];
  is_completed: boolean;
}

export interface ShoppingListItem {
  name: string;
  amount: number;
  unit: string;
  category: string;
  shop_order: number;
  checked: boolean;
}

export interface Unit {
  name: string;
  multiplier_to_grams: number;
}

// --- Interfejsy Pomocnicze dla Komponentów ---

export interface WeekDay {
  date: Date;
  dateStr: string;
  fullDateStr: string;
  dayName: string;
  isToday: boolean;
}

// Interfejs dla wiersza składnika w kreatorze przepisów
export interface IngredientRow {
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Interfejs dla kroku w kreatorze przepisów
export interface StepRow {
  stepNumber: number;
  instruction: string;
}
