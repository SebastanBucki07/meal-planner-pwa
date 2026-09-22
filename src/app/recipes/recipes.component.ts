import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environment';
import { NavbarComponent } from '../components/navbar/navbar.component';

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NavbarComponent],
  templateUrl: './recipes.component.html',
  styleUrls: ['./recipes.component.scss']
})
export class RecipesComponent implements OnInit {
  private supabase: SupabaseClient;
  recipes: any[] = [];
  loading = true;

  // Właściwości do filtrowania
  searchTerm = '';
  maxCalories: number | null = null;
  minProtein: number | null = null;
  minCarbs: number | null = null; // Dodane
  minFat: number | null = null; // Dodane

  private filterTimeout: any;

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit() {
    await this.fetchRecipes();
  }

  applyFilters() {
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => {
      this.fetchRecipes();
    }, 300);
  }

  async fetchRecipes() {
    this.loading = true;

    let query = this.supabase.from('recipes').select('*').order('created_at', { ascending: false });

    // Filtrowanie po słowie kluczowym
    if (this.searchTerm) {
      query = query.ilike('title', `%${this.searchTerm}%`);
    }

    // Filtrowanie po kaloryczności
    if (this.maxCalories !== null && this.maxCalories > 0) {
      query = query.lte('calories', this.maxCalories);
    }

    // Filtrowanie po białku
    if (this.minProtein !== null && this.minProtein > 0) {
      query = query.gte('protein', this.minProtein);
    }

    // Filtrowanie po węglowodanach (nowe)
    if (this.minCarbs !== null && this.minCarbs > 0) {
      query = query.gte('carbs', this.minCarbs);
    }

    // Filtrowanie po tłuszczach (nowe)
    if (this.minFat !== null && this.minFat > 0) {
      query = query.gte('fat', this.minFat);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Błąd pobierania przepisów:', error);
    } else if (data) {
      this.recipes = data;
    }
    this.loading = false;
  }
}
