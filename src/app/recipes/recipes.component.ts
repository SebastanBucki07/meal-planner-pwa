import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environment';

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './recipes.component.html',
  styleUrls: ['./recipes.component.scss']
})
export class RecipesComponent implements OnInit {
  private supabase: SupabaseClient;
  recipes: any[] = [];
  loading = true;

  // Filtry
  searchTerm = '';
  maxCalories: number | null = null;
  minProtein: number | null = null;
  minCarbs: number | null = null;
  minFat: number | null = null;

  // Paginacja
  currentPage = 1;
  pageSize = 12; // Liczba przepisów na stronę (idealna pod 2, 3 lub 4 kolumny)
  totalRecipes = 0;
  totalPages = 1;

  private filterTimeout: any;

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit() {
    await this.fetchRecipes();
  }

  applyFilters() {
    this.currentPage = 1; // Reset do 1. strony po zmianie filtrów
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => {
      this.fetchRecipes();
    }, 300);
  }

  async fetchRecipes() {
    this.loading = true;

    // Pobieramy dane z licznikiem (count: 'exact')
    let query = this.supabase
      .from('recipes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (this.searchTerm) {
      query = query.ilike('title', `%${this.searchTerm}%`);
    }
    if (this.maxCalories !== null && this.maxCalories > 0) {
      query = query.lte('calories', this.maxCalories);
    }
    if (this.minProtein !== null && this.minProtein > 0) {
      query = query.gte('protein', this.minProtein);
    }
    if (this.minCarbs !== null && this.minCarbs > 0) {
      query = query.gte('carbs', this.minCarbs);
    }
    if (this.minFat !== null && this.minFat > 0) {
      query = query.gte('fat', this.minFat);
    }

    // Obliczanie zakresu stron
    const from = (this.currentPage - 1) * this.pageSize;
    const to = from + this.pageSize - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Błąd pobierania przepisów:', error);
    } else if (data) {
      this.recipes = data;
      this.totalRecipes = count || 0;
      this.totalPages = Math.ceil(this.totalRecipes / this.pageSize) || 1;
    }
    this.loading = false;
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages && newPage !== this.currentPage) {
      this.currentPage = newPage;
      this.fetchRecipes();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
