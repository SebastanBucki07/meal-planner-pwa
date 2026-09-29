import { Injectable, signal } from '@angular/core';
import { Ingredient } from '../models/';
import { IngredientMapper, NewIngredientDTO } from '../mappers/ingredient.mapper';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class IngredientService {
  private supabase: SupabaseClient;

  ingredients = signal<Ingredient[]>([]);
  loading = signal<boolean>(false);

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async fetchIngredients(searchTerm = ''): Promise<void> {
    this.loading.set(true);
    try {
      let query = this.supabase
        .from('new_ingredients')
        .select('*')
        .order('name', { ascending: true });

      if (searchTerm.trim()) {
        query = query.ilike('name', `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Błąd podczas pobierania składników:', error);
        return;
      }

      const dtos = (data as NewIngredientDTO[]) || [];
      const domainIngredients = dtos.map(dto => IngredientMapper.toDomain(dto));

      this.ingredients.set(domainIngredients);
    } catch (err) {
      console.error('Wystąpił błąd:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async saveIngredient(ingredient: Ingredient): Promise<boolean> {
    this.loading.set(true);
    try {
      const dto = IngredientMapper.toDTO(ingredient);

      if (ingredient.id) {
        const { error } = await this.supabase
          .from('new_ingredients')
          .update({
            name: dto.name,
            category_id: dto.category_id,
            calories_per_100g: dto.calories_per_100g,
            protein_per_100g: dto.protein_per_100g,
            carbs_per_100g: dto.carbs_per_100g,
            fat_per_100g: dto.fat_per_100g,
            default_unit_id: dto.default_unit_id // <-- Zmienione z default_unit na default_unit_id
          })
          .eq('id', ingredient.id);

        if (error) throw error;
      } else {
        delete dto.id;

        const { error } = await this.supabase.from('new_ingredients').insert([dto]);

        if (error) throw error;
      }

      await this.fetchIngredients();
      return true;
    } catch (err) {
      console.error('Błąd podczas zapisu składnika:', err);
      return false;
    } finally {
      this.loading.set(false);
    }
  }
}
