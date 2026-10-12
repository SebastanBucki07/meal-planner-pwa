export interface Product {
  id: string;
  userId?: string;
  ingredientId: string; // Powiązanie z generycznym składnikiem (np. "Ser żółty")
  name: string;         // np. "Ser Gouda Plastry"
  brand?: string;       // np. "Mlekpol"
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  createdAt?: string;
}

export interface MealPlanProductOverride {
  id?: string;
  mealPlanId: string;
  ingredientId: string;
  productId: string;
  product?: Product; // Opcjonalnie zmapowany obiekt produktu po zapytaniu (join)
}
