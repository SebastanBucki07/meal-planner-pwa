import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environment';
import { NavbarComponent } from '../components/navbar/navbar.component';

// Interfejsy
interface Recipe {
  id: string;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url?: string;
}

interface PlannedMeal {
  id: string;
  meal_type: string;
  recipe: Recipe;
}

interface DayPlan {
  date: string;
  meals: PlannedMeal[];
}

@Component({
  selector: 'app-meal-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './meal-plan-component.component.html',
  styleUrls: ['./meal-plan-component.component.scss']
})
export class MealPlanComponent implements OnInit {
  private supabase: SupabaseClient;

  loading: boolean = true;
  currentDate: Date = new Date();

  plan: DayPlan = { date: '', meals: [] };

  // Modal i wyszukiwarka
  isModalOpen: boolean = false;
  modalMealType: string = '';
  searchTerm: string = '';
  searchResults: Recipe[] = [];

  private searchTimeout: any;

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  ngOnInit() {
    this.fetchPlanForDate(this.currentDate);
  }

  // 1. Zarządzanie datą
  changeDate(days: number) {
    this.currentDate.setDate(this.currentDate.getDate() + days);
    this.fetchPlanForDate(this.currentDate);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // 2. Pobieranie danych z Supabase
  async fetchPlanForDate(date: Date) {
    this.loading = true;
    const dateString = this.formatDate(date);

    const { data, error } = await this.supabase
      .from('meal_plan')
      .select('id, meal_type, recipes(*)')
      .eq('date', dateString);

    if (error) {
      console.error('Błąd pobierania planu:', error);
      this.plan = { date: dateString, meals: [] };
    } else {
      this.plan = {
        date: dateString,
        meals: data.map((item: any) => ({
          id: item.id,
          meal_type: item.meal_type,
          recipe: item.recipes
        })).filter(m => m.recipe)
      };
    }
    this.loading = false;
  }

  // 3. Logika modala wyszukiwarki
  openAddMealModal(mealType: string) {
    this.isModalOpen = true;
    this.modalMealType = mealType;
    this.searchTerm = '';
    this.searchResults = [];
  }

  closeModal() {
    this.isModalOpen = false;
  }

  // 4. Wyszukiwanie przepisów
  onSearchChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      if (this.searchTerm.length > 2) {
        this.searchRecipes();
      } else {
        this.searchResults = [];
      }
    }, 300);
  }

  async searchRecipes() {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*')
      .ilike('title', `%${this.searchTerm}%`)
      .limit(20);

    if (error) {
      console.error('Błąd wyszukiwania przepisów:', error);
    } else {
      this.searchResults = data || [];
    }
  }

  // 5. Dodawanie i usuwanie posiłków
  async addRecipeToPlan(recipeId: string) {
    const { error } = await this.supabase.from('meal_plan').insert({
      date: this.plan.date,
      meal_type: this.modalMealType,
      recipe_id: recipeId
    });

    if (error) {
      console.error('Błąd dodawania posiłku:', error);
    } else {
      this.fetchPlanForDate(this.currentDate);
      this.closeModal();
    }
  }

  async removeMeal(mealId: string) {
    if (!confirm('Czy na pewno chcesz usunąć ten posiłek?')) return;

    const { error } = await this.supabase
      .from('meal_plan')
      .delete()
      .eq('id', mealId);

    if (error) {
      console.error('Błąd usuwania posiłku:', error);
    } else {
      this.fetchPlanForDate(this.currentDate);
    }
  }

  // Pomocnicze gettery do szablonu
  getMealForType(mealType: string): PlannedMeal | undefined {
    return this.plan.meals.find(m => m.meal_type === mealType);
  }
}
