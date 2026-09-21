import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NavbarComponent} from '../navbar/navbar.component';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {environment} from '../../../environment';

export interface PlannedMeal {
  id: string;
  meal_type: string;
  recipe: {
    id: string;
    title: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image_url?: string;
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private supabase: SupabaseClient;

  loading: boolean = true;
  todayDate: string = new Date().toISOString().split('T')[0];

  // Sekcje posiłków
  readonly mealTypes: string[] = [
    'Śniadanie',
    'II śniadanie',
    'Obiad',
    'Kolacja',
    'Przekąska'
  ];

  targetCalories: number = 2000;
  targetProtein: number = 150;
  targetCarbs: number = 200;
  targetFat: number = 65;

  todayMeals: PlannedMeal[] = [];
  recentRecipes: any[] = [];

  consumedCalories: number = 0;
  consumedProtein: number = 0;
  consumedCarbs: number = 0;
  consumedFat: number = 0;

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit() {
    await Promise.all([
      this.fetchUserProfile(),
      this.fetchTodayMealPlan(),
      this.fetchRecentRecipes()
    ]);
    this.loading = false;
  }

  // Mapowanie wartości z bazy danych do spójnych etykiet w interfejsie
  private dbKeyToMealType(key: string): string {
    const map: Record<string, string> = {
      'Śniadanie': 'Śniadanie',
      'sniadanie': 'Śniadanie',
      'Drugie Śniadanie': 'II śniadanie',
      'Drugie śniadanie': 'II śniadanie',
      'drugie_sniadanie': 'II śniadanie',
      'Obiad': 'Obiad',
      'obiad': 'Obiad',
      'Kolacja': 'Kolacja',
      'kolacja': 'Kolacja',
      'Przekąska': 'Przekąska',
      'przekaska': 'Przekąska'
    };
    return map[key] || key;
  }

  async fetchUserProfile() {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (user) {
      const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

      if (data) {
        this.targetCalories = data.target_calories || 2000;
        this.targetProtein = data.target_protein || 150;
        this.targetCarbs = data.target_carbs || 200;
        this.targetFat = data.target_fat || 65;
      }
    }
  }

  async fetchTodayMealPlan() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.todayDate = `${year}-${month}-${day}`;

    const { data: { user } } = await this.supabase.auth.getUser();

    let query = this.supabase
    .from('meal_plans')
    .select('id, meal_type, recipe_id, user_id')
    .eq('date', this.todayDate);

    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { data: mealPlans, error: mealPlansError } = await query;

    if (mealPlansError) {
      console.error('Błąd pobierania planu na dziś:', mealPlansError);
      return;
    }

    if (!mealPlans || mealPlans.length === 0) {
      this.todayMeals = [];
      this.calculateDailyTotals();
      return;
    }

    const recipeIds = mealPlans.map(p => p.recipe_id).filter(id => id != null);

    if (recipeIds.length === 0) {
      this.todayMeals = [];
      this.calculateDailyTotals();
      return;
    }

    const { data: recipes, error: recipesError } = await this.supabase
    .from('recipes')
    .select('*')
    .in('id', recipeIds);

    if (recipesError) {
      console.error('Błąd pobierania przepisów:', recipesError);
      return;
    }

    const recipesById = new Map(recipes.map(r => [r.id, r]));

    this.todayMeals = mealPlans
    .map(plan => {
      const recipe = recipesById.get(plan.recipe_id);
      if (recipe) {
        return {
          id: plan.id,
          meal_type: this.dbKeyToMealType(plan.meal_type),
          recipe: recipe,
        } as PlannedMeal;
      }
      return null;
    })
    .filter((meal): meal is PlannedMeal => meal !== null);

    this.calculateDailyTotals();
  }

  async fetchRecentRecipes() {
    const { data, error } = await this.supabase
    .from('recipes')
    .select('id, title, calories, protein, image_url')
    .order('created_at', { ascending: false })
    .limit(3);

    if (error) {
      console.error('Błąd pobierania ostatnich przepisów:', error);
    } else if (data) {
      this.recentRecipes = data;
    }
  }

  // Pobieranie posiłków dla wybranego typu
  getMealsForType(mealType: string): PlannedMeal[] {
    return this.todayMeals.filter(
      m => m.meal_type.toLowerCase() === mealType.toLowerCase()
    );
  }

  calculateDailyTotals() {
    this.consumedCalories = this.todayMeals.reduce(
      (sum, item) => sum + Number(item.recipe?.calories || 0), 0
    );

    this.consumedProtein = Number(
      this.todayMeals.reduce((sum, item) => sum + Number(item.recipe?.protein || 0), 0).toFixed(1)
    );

    this.consumedCarbs = Number(
      this.todayMeals.reduce((sum, item) => sum + Number(item.recipe?.carbs || 0), 0).toFixed(1)
    );

    this.consumedFat = Number(
      this.todayMeals.reduce((sum, item) => sum + Number(item.recipe?.fat || 0), 0).toFixed(1)
    );
  }

  getCaloriePercentage(): number {
    if (!this.targetCalories) return 0;
    return Math.round((this.consumedCalories / this.targetCalories) * 100);
  }

  // Oblicza rzeczywisty procent (może być wyższy niż 100%)
  getMacroPercent(consumed: number, target: number): number {
    if (!target || target === 0) return 0;
    return Math.round((consumed / target) * 100);
  }

// Zwraca szerokość paska do wizualizacji w UI (max 100% dla paska)
  getProgressBarWidth(consumed: number, target: number): number {
    return Math.min(this.getMacroPercent(consumed, target), 100);
  }

// Dynamiczna klasa statusu w zależności od stopnia realizacji/przekroczenia celu
  getStatusClass(consumed: number, target: number): string {
    if (!target || target === 0) return 'status-normal';
    const percent = this.getMacroPercent(consumed, target);

    if (percent < 85) return 'status-under';   // Za mało (np. żółty/niebieski)
    if (percent <= 105) return 'status-ok';    // W celu (zielony)
    if (percent <= 115) return 'status-warn';  // Lekkie przekroczenie (pomarańczowy)
    return 'status-over';                      // Duże przekroczenie (czerwony)
  }
}
