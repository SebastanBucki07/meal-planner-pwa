export interface Recipe {
  id: string;
  title: string;
  image_url?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description?: string;
  instructions?: string;
  ingredients_list?: any[];
}
