import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';
import {ChartPoint} from '../../models/chartPoint.model';
import {WeightEntry} from '../../models/weightEntry.model';
import {PlannedMeal} from '../../models';
import {MEAL_TYPES} from '../../models/mealTypes.model';
import {dbKeyToMealType} from '../../helpers/mealType.helper';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private supabase: SupabaseClient;
  private router = inject(Router);

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

  // Podsumowanie poprzedniego tygodnia
  prevWeekAvgCalories: number = 0;
  prevWeekDaysTracked: number = 0;

  // Wykres wagi
  weightHistory: WeightEntry[] = [];
  latestWeight: number | null = null;

  // Konfiguracja i skala wykresu SVG
  readonly svgWidth: number = 600;
  readonly svgHeight: number = 260;
  readonly padding = { top: 30, right: 30, bottom: 50, left: 50 };

  minWeight: number = 0;
  maxWeight: number = 100;
  yGridLines: { value: number; y: number }[] = [];

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit() {
    await Promise.all([
      this.fetchUserProfile(),
      this.fetchTodayMealPlan(),
      this.fetchRecentRecipes(),
      this.fetchPreviousWeekSummary(),
      this.fetchWeightHistory()
    ]);
    this.loading = false;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.router.navigate(['/auth']);
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

    if (mealPlansError || !mealPlans || mealPlans.length === 0) {
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

    if (recipesError || !recipes) return;

    const recipesById = new Map(recipes.map(r => [r.id, r]));

    this.todayMeals = mealPlans
    .map(plan => {
      const recipe = recipesById.get(plan.recipe_id);
      if (recipe) {
        return {
          id: plan.id,
          meal_type: dbKeyToMealType(plan.meal_type),
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

    if (!error && data) {
      this.recentRecipes = data;
    }
  }

  async fetchPreviousWeekSummary(): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - 1);

    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - 7);

    const startStr = lastWeekStart.toISOString().split('T')[0];
    const endStr = lastWeekEnd.toISOString().split('T')[0];

    const { data, error } = await this.supabase
    .from('meal_plans')
    .select('date, recipes(calories)')
    .eq('user_id', user.id)
    .gte('date', startStr)
    .lte('date', endStr);

    if (error || !data) return;

    const dayTotals: Record<string, number> = {};
    data.forEach((item: any) => {
      const kcal = item.recipes?.calories || 0;
      dayTotals[item.date] = (dayTotals[item.date] || 0) + kcal;
    });

    const daysCount = Object.keys(dayTotals).length;
    this.prevWeekDaysTracked = daysCount;

    if (daysCount > 0) {
      const totalKcal = Object.values(dayTotals).reduce((a, b) => a + b, 0);
      this.prevWeekAvgCalories = Math.round(totalKcal / daysCount);
    }
  }

  async fetchWeightHistory(): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    // Pobieramy 6 najnowszych pomiarów (sortując malejąco, żeby wziąć OSTATNIE 6)
    const { data, error } = await this.supabase
    .from('weight_logs')
    .select('date, weight')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(6);

    if (!error && data && data.length > 0) {
      // Odwracamy tablicę, aby na wykresie punkty były ukłożone chronologicznie (od najstarszego do najnowszego)
      const sortedData = data.reverse();

      this.weightHistory = sortedData.map((d: any) => {
        const rawDate = new Date(d.date);
        const formattedDate = !isNaN(rawDate.getTime())
          ? rawDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : String(d.date);

        return {
          date: String(d.date),
          fullDate: formattedDate,
          weight: Number(d.weight)
        };
      });

      this.latestWeight = this.weightHistory[this.weightHistory.length - 1].weight;
      this.calculateYScale();
    } else {
      this.weightHistory = [];
      this.latestWeight = null;
    }
  }

  // Getter ułatwiający pobranie dokładnie ostatnich 6 pomiarów bezpośrednio w pliku HTML
  get recentWeightHistory(): WeightEntry[] {
    return this.weightHistory.slice(-6);
  }

  // Oblicza dynamiczny zakres osi Y z zachowaniem marginesu
  private calculateYScale(): void {
    if (this.weightHistory.length === 0) return;

    const weights = this.weightHistory.map(w => w.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);

    // Margines ±2 kg
    this.minWeight = Math.floor(min - 2);
    this.maxWeight = Math.ceil(max + 2);

    if (this.minWeight === this.maxWeight) {
      this.minWeight -= 5;
      this.maxWeight += 5;
    }

    // Podział na 3 odcinki (4 poziome linie)
    const steps = 3;
    const stepValue = (this.maxWeight - this.minWeight) / steps;
    this.yGridLines = [];

    for (let i = 0; i <= steps; i++) {
      const val = Math.round((this.minWeight + stepValue * i) * 10) / 10;
      const yPos = this.getNormalizedY(val);
      this.yGridLines.push({ value: val, y: yPos });
    }
  }

  // Zamiana wartości wagowych w kg na współrzędną Y układu SVG
  private getNormalizedY(weight: number): number {
    const drawHeight = this.svgHeight - this.padding.top - this.padding.bottom;
    const range = this.maxWeight - this.minWeight;
    const normalized = (weight - this.minWeight) / range;
    return this.svgHeight - this.padding.bottom - (normalized * drawHeight);
  }

  // Obliczenia współrzędnych punktów na wykresie SVG
  get chartPoints(): ChartPoint[] {
    if (this.weightHistory.length === 0) return [];

    const drawWidth = this.svgWidth - this.padding.left - this.padding.right;
    const stepX = this.weightHistory.length > 1
      ? drawWidth / (this.weightHistory.length - 1)
      : drawWidth / 2;

    return this.weightHistory.map((item, index) => {
      const x = this.weightHistory.length === 1
        ? this.svgWidth / 2
        : this.padding.left + index * stepX;
      const y = this.getNormalizedY(item.weight);

      return {
        x,
        y,
        weight: item.weight,
        date: item.fullDate
      };
    });
  }

  // Ciąg punktów do parametru points w polyline / path SVG
  get polylinePoints(): string {
    return this.chartPoints.map(p => `${p.x},${p.y}`).join(' ');
  }

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

  getMacroPercent(consumed: number, target: number): number {
    if (!target || target === 0) return 0;
    return Math.round((consumed / target) * 100);
  }

  getProgressBarWidth(consumed: number, target: number): number {
    return Math.min(this.getMacroPercent(consumed, target), 100);
  }

  getStatusClass(consumed: number, target: number): string {
    if (consumed > target) {
      return 'exceeded';
    }
    return 'ok';
  }

  protected readonly MEAL_TYPES = MEAL_TYPES;
}
