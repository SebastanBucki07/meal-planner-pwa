import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';
import { Product, MealPlanProductOverride } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private supabase: SupabaseClient;

  // Sygnały stanu dla komponentu listy produktów
  public products = signal<Product[]>([]);
  public loading = signal<boolean>(false);

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  /**
   * Pobiera listę produktów (opcjonalnie z filtrowaniem po wyszukiwanej frazie)
   */
  async fetchProducts(searchQuery: string = ''): Promise<void> {
    this.loading.set(true);
    let query = this.supabase.from('new_products').select('*');

    if (searchQuery && searchQuery.trim() !== '') {
      query = query.or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Błąd pobierania listy produktów:', error);
      this.products.set([]);
    } else {
      const mapped: Product[] = (data || []).map(item => ({
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
      this.products.set(mapped);
    }
    this.loading.set(false);
  }

  /**
   * Pobiera listę konkretnych produktów (markowych) dla danego składnika generycznego
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
        carbsPer100g: item.new_products.carbs_per_100g,
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

  /**
   * Tworzy nowy produkt (wariant markowy) w bazie danych
   */
  async addProduct(productData: {
    ingredientId: string;
    name: string;
    brand?: string | null;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  }): Promise<Product | null> {
    const { data, error } = await this.supabase
    .from('new_products')
    .insert({
      ingredient_id: productData.ingredientId,
      name: productData.name,
      brand: productData.brand || null,
      calories_per_100g: productData.caloriesPer100g,
      protein_per_100g: productData.proteinPer100g,
      carbs_per_100g: productData.carbsPer100g,
      fat_per_100g: productData.fatPer100g
    })
    .select()
    .single();

    if (error) {
      console.error('Błąd dodawania nowego produktu:', error);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      ingredientId: data.ingredient_id,
      name: data.name,
      brand: data.brand,
      caloriesPer100g: data.calories_per_100g,
      proteinPer100g: data.protein_per_100g,
      carbsPer100g: data.carbs_per_100g,
      fatPer100g: data.fat_per_100g
    };
  }

  /**
   * Uniwersalna metoda zapisu (edycja lub dodawanie) z automatycznym odświeżeniem listy
   */
  async saveProduct(product: Product): Promise<boolean> {
    if (product.id && product.id.trim() !== '') {
      const { error } = await this.supabase
      .from('new_products')
      .update({
        ingredient_id: product.ingredientId,
        name: product.name,
        brand: product.brand || null,
        calories_per_100g: product.caloriesPer100g,
        protein_per_100g: product.proteinPer100g,
        carbs_per_100g: product.carbsPer100g,
        fat_per_100g: product.fatPer100g
      })
      .eq('id', product.id);

      if (error) {
        console.error('Błąd aktualizacji produktu:', error);
        return false;
      }
    } else {
      const created = await this.addProduct({
        ingredientId: product.ingredientId,
        name: product.name,
        brand: product.brand,
        caloriesPer100g: product.caloriesPer100g,
        proteinPer100g: product.proteinPer100g,
        carbsPer100g: product.carbsPer100g,
        fatPer100g: product.fatPer100g
      });
      if (!created) return false;
    }

    await this.fetchProducts();
    return true;
  }
}
