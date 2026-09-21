import {Component, OnInit} from '@angular/core';
import {CommonModule, NgClass} from '@angular/common';
import {RouterLink} from '@angular/router';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {environment} from '../../../environment'
import {NavbarComponent} from '../navbar/navbar.component';

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
  imports: [CommonModule, NgClass, RouterLink, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private supabase: SupabaseClient;

  loading: boolean = true;
  todayDate: string = new Date().toISOString().split('T')[0];

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
      this.fetchUserProfile(), // <-- Pobieramy cele użytkownika
      this.fetchTodayMealPlan(),
      this.fetchRecentRecipes()
    ]);
    this.loading = false;
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

    // 1. Pobierz plany posiłków na dziś
    const {data: mealPlans, error: mealPlansError} = await this.supabase
    .from('meal_plan')
    .select('id, meal_type, recipe_id')
    .eq('date', this.todayDate);

    if (mealPlansError) {
      console.error('Błąd pobierania planu na dziś:', mealPlansError);
      return;
    }

    if (!mealPlans || mealPlans.length === 0) {
      this.todayMeals = [];
      this.calculateDailyTotals();
      return;
    }

    // 2. Zbierz ID wszystkich potrzebnych przepisów
    const recipeIds = mealPlans.map(p => p.recipe_id).filter(id => id != null);

    if (recipeIds.length === 0) {
      this.todayMeals = [];
      this.calculateDailyTotals();
      return;
    }

    // 3. Pobierz wszystkie przepisy jednym zapytaniem
    const {data: recipes, error: recipesError} = await this.supabase
    .from('recipes')
    .select('*')
    .in('id', recipeIds);

    if (recipesError) {
      console.error('Błąd pobierania przepisów:', recipesError);
      return;
    }

    // 4. Połącz plany posiłków z przepisami
    const recipesById = new Map(recipes.map(r => [r.id, r]));

    this.todayMeals = mealPlans
    .map(plan => {
      const recipe = recipesById.get(plan.recipe_id);
      if (recipe) {
        return {
          id: plan.id,
          meal_type: plan.meal_type,
          recipe: recipe,
        } as PlannedMeal;
      }
      return null;
    })
    .filter((meal): meal is PlannedMeal => meal !== null);

    this.calculateDailyTotals();
  }

  async fetchRecentRecipes() {
    const {data, error} = await this.supabase
    .from('recipes')
    .select('id, title, calories, protein, image_url')
    .order('created_at', {ascending: false})
    .limit(3);

    if (error) {
      console.error('Błąd pobierania ostatnich przepisów:', error);
    } else if (data) {
      this.recentRecipes = data;
    }
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

  // Odpowiedni szerokość paska postępu (max 100% dla wyglądu interfejsu)
  getProgressBarWidth(): number {
    return Math.min(this.getCaloriePercentage(), 100);
  }

  getStatusClass(consumed: number, target: number): string {
    if (!target || target === 0) return 'status-yellow';

    const ratio = consumed / target;

    if (ratio < 0.85) {
      return 'status-yellow';
    } else if (ratio <= 1.05) {
      return 'status-green';
    } else if (ratio <= 1.15) {
      return 'status-orange';
    } else {
      return 'status-red';
    }
  }
}
