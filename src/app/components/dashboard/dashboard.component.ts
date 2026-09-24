import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';
import { ChartPoint } from '../../models/chartPoint.model';
import { WeightEntry } from '../../models/weightEntry.model';
import { PlannedMeal } from '../../models';
import { MEAL_TYPES } from '../../models/mealTypes.model';
import { dbKeyToMealType } from '../../helpers/mealType.helper';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private supabase: SupabaseClient;
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  loading = true;
  todayDate: string = new Date().toISOString().split('T')[0];

  targetCalories = 2000;
  targetProtein = 150;
  targetCarbs = 200;
  targetFat = 65;

  todayMeals: PlannedMeal[] = [];
  recentRecipes: any[] = [];

  consumedCalories = 0;
  consumedProtein = 0;
  consumedCarbs = 0;
  consumedFat = 0;

  // Podsumowanie poprzedniego tygodnia
  prevWeekAvgCalories = 0;
  prevWeekDaysTracked = 0;

  // Wykres wagi
  weightHistory: WeightEntry[] = [];
  latestWeight: number | null = null;

  // Konfiguracja i skala wykresu SVG
  readonly svgWidth = 600;
  readonly svgHeight = 260;
  readonly padding = { top: 30, right: 30, bottom: 50, left: 50 };

  minWeight = 0;
  maxWeight = 100;
  yGridLines: { value: number; y: number }[] = [];

  // --- Stan Modala Przepisu ---
  selectedRecipe: any = null;
  completedSteps: { [key: number]: boolean } = {};

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

  async fetchUserProfile() {
    const {
      data: { user }
    } = await this.supabase.auth.getUser();
    if (user) {
      const { data } = await this.supabase.from('profiles').select('*').eq('id', user.id).single();

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

    const {
      data: { user }
    } = await this.supabase.auth.getUser();

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
            recipe: recipe
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
    const {
      data: { user }
    } = await this.supabase.auth.getUser();
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
    const {
      data: { user }
    } = await this.supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('date, weight')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(6);

    if (!error && data && data.length > 0) {
      const sortedData = data.reverse();

      this.weightHistory = sortedData.map((d: any) => {
        const rawDate = new Date(d.date);
        const formattedDate = !isNaN(rawDate.getTime())
          ? rawDate.toLocaleDateString('pl-PL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
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

  get recentWeightHistory(): WeightEntry[] {
    return this.weightHistory.slice(-6);
  }

  private calculateYScale(): void {
    if (this.weightHistory.length === 0) return;

    const weights = this.weightHistory.map(w => w.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);

    this.minWeight = Math.floor(min - 2);
    this.maxWeight = Math.ceil(max + 2);

    if (this.minWeight === this.maxWeight) {
      this.minWeight -= 5;
      this.maxWeight += 5;
    }

    const steps = 3;
    const stepValue = (this.maxWeight - this.minWeight) / steps;
    this.yGridLines = [];

    for (let i = 0; i <= steps; i++) {
      const val = Math.round((this.minWeight + stepValue * i) * 10) / 10;
      const yPos = this.getNormalizedY(val);
      this.yGridLines.push({ value: val, y: yPos });
    }
  }

  private getNormalizedY(weight: number): number {
    const drawHeight = this.svgHeight - this.padding.top - this.padding.bottom;
    const range = this.maxWeight - this.minWeight;
    const normalized = (weight - this.minWeight) / range;
    return this.svgHeight - this.padding.bottom - normalized * drawHeight;
  }

  get chartPoints(): ChartPoint[] {
    if (this.weightHistory.length === 0) return [];

    const drawWidth = this.svgWidth - this.padding.left - this.padding.right;
    const stepX =
      this.weightHistory.length > 1 ? drawWidth / (this.weightHistory.length - 1) : drawWidth / 2;

    return this.weightHistory.map((item, index) => {
      const x =
        this.weightHistory.length === 1 ? this.svgWidth / 2 : this.padding.left + index * stepX;
      const y = this.getNormalizedY(item.weight);

      return {
        x,
        y,
        weight: item.weight,
        date: item.fullDate
      };
    });
  }

  get polylinePoints(): string {
    return this.chartPoints.map(p => `${p.x},${p.y}`).join(' ');
  }

  getMealsForType(mealType: string): PlannedMeal[] {
    return this.todayMeals.filter(m => m.meal_type.toLowerCase() === mealType.toLowerCase());
  }

  calculateDailyTotals() {
    this.consumedCalories = this.todayMeals.reduce(
      (sum, item) => sum + Number(item.recipe?.calories || 0),
      0
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

  // --- LOGIKA MODALA PRZEPISU ---

  openRecipeModal(recipe: any): void {
    this.selectedRecipe = recipe;
    this.completedSteps = {};
  }

  closeRecipeModal(): void {
    this.selectedRecipe = null;
    this.completedSteps = {};
  }

  toggleStep(index: number): void {
    this.completedSteps[index] = !this.completedSteps[index];
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  getSafeYoutubeUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      videoId = urlParams.get('v') || '';
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('youtube.com/embed/')[1].split('?')[0];
    }

    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${videoId}`
      );
    }
    return null;
  }

  getParsedSteps(recipe: any): string[] {
    if (!recipe) return [];

    const rawSteps =
      recipe.steps ||
      recipe.instructions ||
      recipe.preparation ||
      recipe.sposob_przygotowania ||
      recipe.description;

    if (!rawSteps) return [];

    if (Array.isArray(rawSteps)) {
      return rawSteps.map(s =>
        typeof s === 'object' ? s.text || s.instruction || JSON.stringify(s) : String(s)
      );
    }

    if (typeof rawSteps === 'string') {
      const steps = rawSteps
        .split(/\r?\n|\.(?=\s|[A-Z]|$)/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      return steps.length > 0 ? steps : [rawSteps];
    }

    return [];
  }

  protected readonly MEAL_TYPES = MEAL_TYPES;
}
