import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { Unit } from '../../models';
import { IngredientCategory } from '../../models/indegredient-category.model';

// Importy modeli z Twojego katalogu modeli

@Component({
  selector: 'app-add-ingredient',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './add-ingredient.component.html',
  styleUrls: ['./add-ingredient.component.scss']
})
export class AddIngredientComponent implements OnInit {
  loading = false;
  categories: IngredientCategory[] = [];
  units: Unit[] = [];

  // Formularz
  name = '';
  categoryId: number | string | null = null;
  defaultUnitId: string | null = null;
  caloriesPer100g = 0;
  proteinPer100g = 0;
  fatPer100g = 0;
  carbsPer100g = 0;

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFormData();
  }

  async loadFormData(): Promise<void> {
    this.loading = true;
    try {
      const categoriesPromise = this.supabase.client
        .from('ingredient_categories')
        .select('*')
        .order('name');

      const unitsPromise = this.supabase.client.from('units').select('*').order('name');

      const [{ data: categoriesData, error: catError }, { data: unitsData, error: unitError }] =
        await Promise.all([categoriesPromise, unitsPromise]);

      if (catError) throw catError;
      if (unitError) throw unitError;

      this.categories = categoriesData || [];
      this.units = unitsData || [];

      if (this.categories.length > 0) this.categoryId = this.categories[0].id;
      if (this.units.length > 0) this.defaultUnitId = this.units[0].id;
    } catch (error) {
      console.error('Błąd ładowania słowników:', error);
    } finally {
      this.loading = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.name.trim()) {
      alert('Wprowadź nazwę składnika.');
      return;
    }

    this.loading = true;
    try {
      const { error } = await this.supabase.client.from('ingredients').insert({
        name: this.name.trim(),
        category_id: this.categoryId,
        default_unit_id: this.defaultUnitId,
        calories_per_100g: this.caloriesPer100g,
        protein_per_100g: this.proteinPer100g,
        fat_per_100g: this.fatPer100g,
        carbs_per_100g: this.carbsPer100g
      });

      if (error) throw error;

      alert('Składnik został pomyślnie dodany!');
      this.resetForm();
    } catch (error: any) {
      console.error('Błąd dodawania składnika:', error);
      alert('Nie udało się dodać składnika: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  private resetForm(): void {
    this.name = '';
    this.caloriesPer100g = 0;
    this.proteinPer100g = 0;
    this.fatPer100g = 0;
    this.carbsPer100g = 0;
    if (this.categories.length > 0) this.categoryId = this.categories[0].id;
    if (this.units.length > 0) this.defaultUnitId = this.units[0].id;
  }
}
