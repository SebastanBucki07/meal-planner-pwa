import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';
import { RecipeMapper } from '../mappers/recipe.mapper';
import { IngredientMapper } from '../mappers/ingredient.mapper';
import {Ingredient, NewIngredientDTO, NewRecipeDTO, Recipe} from '../models';

export interface RecipeFilterParams {
  searchTerm: string;
  maxCalories: number | null;
  minProtein: number | null;
  minCarbs: number | null;
  minFat: number | null;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private supabase: SupabaseClient;

  // Sygnały stanu
  recipes = signal<Recipe[]>([]);
  loading = signal<boolean>(false);
  totalRecipes = signal<number>(0);
  totalPages = signal<number>(1);

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  /**
   * Pobieranie listy przepisów z uwzględnieniem filtrów i paginacji
   */
  async fetchRecipes(params: RecipeFilterParams): Promise<void> {
    this.loading.set(true);

    let query = this.supabase
    .from('new_recipes')
    .select('*, new_recipe_ingredients(*, new_ingredients(*))', { count: 'exact' })
    .order('created_at', { ascending: false });

    if (params.searchTerm) {
      query = query.ilike('title', `%${params.searchTerm}%`);
    }
    if (params.maxCalories !== null && params.maxCalories > 0) {
      query = query.lte('calories', params.maxCalories);
    }
    if (params.minProtein !== null && params.minProtein > 0) {
      query = query.gte('protein', params.minProtein);
    }
    if (params.minCarbs !== null && params.minCarbs > 0) {
      query = query.gte('carbs', params.minCarbs);
    }
    if (params.minFat !== null && params.minFat > 0) {
      query = query.gte('fat', params.minFat);
    }

    const from = (params.page - 1) * params.pageSize;
    const to = from + params.pageSize - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Błąd pobierania przepisów:', error);
      this.recipes.set([]);
    } else if (data) {
      const mapped = (data as NewRecipeDTO[]).map(dto => RecipeMapper.toDomain(dto));
      this.recipes.set(mapped);

      const total = count || 0;
      this.totalRecipes.set(total);
      this.totalPages.set(Math.ceil(total / params.pageSize) || 1);
    }

    this.loading.set(false);
  }

  async getRecipeById(id: string): Promise<Recipe | null> {
    const { data, error } = await this.supabase
    .from('new_recipes')
    .select(`
        *,
        new_recipe_ingredients (
          amount_in_grams,
          new_ingredients (
            name,
            calories_per_100g,
            protein_per_100g,
            carbs_per_100g,
            fat_per_100g
          )
        )
      `)
    .eq('id', id)
    .single();

    if (error || !data) {
      console.error('Błąd pobierania przepisu po ID:', error);
      return null;
    }

    return RecipeMapper.toDomain(data);
  }

  /**
   * Pobieranie słownika wszystkich dostępnych składników
   */
  async getIngredients(): Promise<Ingredient[]> {
    const { data, error } = await this.supabase
    .from('new_ingredients')
    .select('*')
    .order('name', { ascending: true });

    if (error) {
      console.error('Błąd podczas pobierania składników:', error);
      return [];
    }

    return (data as NewIngredientDTO[]).map(dto => IngredientMapper.toDomain(dto));
  }


}
