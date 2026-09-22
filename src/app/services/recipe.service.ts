import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environment';

export interface Ingredient {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  // Metoda do pobierania listy składników z bazy
  async getIngredients(): Promise<Ingredient[]> {
    const { data, error } = await this.supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Błąd podczas pobierania składników:', error);
      return [];
    }

    return data || [];
  }
}
