import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';
import { Product, MealPlanProductOverride } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  /**
   * Pobiera listę konkretnych produktów (markowych) dla danej kategorii/składnika generycznego
   */
  async getProductsForIngredient(ingredientId: string): Promise<Product[]> {
    const { data, error } = await this.supabase
    .from('new_products')
    .select('*')
    .eq('ingredient_id', ingredientId);

    if (error) {
      console.error('Błąd pobierania produktów:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      ingredientId: item.ingredient_id,
      name: item.name,
      brand: item.brand,
      caloriesPer100g: item.calories_per_100g,
      proteinPer100g: item.protein_per_100g,
      carbsPer100g: item.carbs_per_100g,
      fatPer100g: item.fat_per_100g
    }));
  }

  /**
   * Pobiera zapisane nadpisania produktów dla konkretnego posiłku w planie
   */
  async getOverridesForMealPlan(mealPlanId: string): Promise<MealPlanProductOverride[]> {
    const { data, error } = await this.supabase
    .from('new_meal_plan_product_overrides')
    .select(`
        id,
        meal_plan_id,
        ingredient_id,
        product_id,
        new_products (*)
      `)
    .eq('meal_plan_id', mealPlanId);

    if (error) {
      console.error('Błąd pobierania nadpisań produktów dla posiłku:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      mealPlanId: item.meal_plan_id,
      ingredientId: item.ingredient_id,
      productId: item.product_id,
      product: item.new_products ? {
        id: item.new_products.id,
        ingredientId: item.new_products.ingredient_id,
        name: item.new_products.name,
        brand: item.new_products.brand,
        caloriesPer100g: item.new_products.calories_per_100g,
        proteinPer100g: item.new_products.protein_per_100g,
        carbsPer100g: item.new_products.new_products?.carbs_per_100g ?? item.new_products.carbs_per_100g,
        fatPer100g: item.new_products.fat_per_100g
      } : undefined
    }));
  }

  /**
   * Zapisuje lub aktualizuje wybór konkretnego produktu dla składnika w danym posiłku
   */
  async saveProductOverride(mealPlanId: string, ingredientId: string, productId: string): Promise<boolean> {
    const { error } = await this.supabase
    .from('new_meal_plan_product_overrides')
    .upsert({
      meal_plan_id: mealPlanId,
      ingredient_id: ingredientId,
      product_id: productId
    }, {
      onConflict: 'meal_plan_id,ingredient_id'
    });

    if (error) {
      console.error('Błąd zapisu nadpisania produktu:', error);
      return false;
    }

    return true;
  }

  /**
   * Usuwa nadpisanie (wraca do domyślnego generycznego składnika)
   */
  async removeProductOverride(mealPlanId: string, ingredientId: string): Promise<boolean> {
    const { error } = await this.supabase
    .from('new_meal_plan_product_overrides')
    .delete()
    .eq('meal_plan_id', mealPlanId)
    .eq('ingredient_id', ingredientId);

    if (error) {
      console.error('Błąd usuwania nadpisania produktu:', error);
      return false;
    }

    return true;
  }
}
