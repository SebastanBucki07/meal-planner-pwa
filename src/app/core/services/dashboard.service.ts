import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { NewWeightLogDTO, WeightEntry } from '../models';
import { DaySummary, DashboardMealItem } from '../models/dashboard.model';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private supabase: SupabaseClient;

  weightHistory = signal<WeightEntry[]>([]);
  todaySummary = signal<DaySummary>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  todayMeals = signal<DashboardMealItem[]>([]);
  loading = signal<boolean>(false);

  todayWeight = computed(() => {
    const history = this.weightHistory();
    if (!history || history.length === 0) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEntry = history.find(entry => entry.date === todayStr);
    return todayEntry ? todayEntry.weight : null;
  });

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async loadDashboardData(): Promise<void> {
    this.loading.set(true);
    try {
      const {
        data: { user }
      } = await this.supabase.auth.getUser();
      if (!user) return;

      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Historia wagi
      const { data: weightData, error: weightError } = await this.supabase
      .from('new_weight_logs')
      .select('id, user_id, weight, date, logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true })
      .limit(30);

      if (!weightError && weightData) {
        const dtoList = weightData as NewWeightLogDTO[];
        const domainList: WeightEntry[] = dtoList.map(dto => {
          const rawDate = dto.logged_at || dto.date || new Date().toISOString();
          const formattedDate = rawDate.split('T')[0].split(' ')[0];

          return {
            id: dto.id,
            date: formattedDate,
            weight: Number(dto.weight)
          };
        });

        this.weightHistory.set(domainList);
      }

      // 2. Dzisiejsze posiłki (z nowymi polami image_url oraz makro)
      const { data: mealData, error: mealError } = await this.supabase
      .from('new_meal_plans')
      .select('id, calories, protein, carbs, fat, completed, custom_name, meal_type, new_recipes(title, image_url)')
      .eq('date', todayStr);

      if (!mealError && mealData) {
        const mealsList: DashboardMealItem[] = mealData.map((dto: any) => ({
          id: dto.id || '',
          name: dto.new_recipes?.title || dto.custom_name || 'Posiłek',
          calories: Math.round(dto.calories || 0),
          protein: Math.round(dto.protein || 0),
          carbs: Math.round(dto.carbs || 0),
          fat: Math.round(dto.fat || 0),
          imageUrl: dto.new_recipes?.image_url || null,
          completed: !!dto.completed,
          mealType: dto.meal_type || 'Przekąska'
        }));

        this.todayMeals.set(mealsList);

        // Podsumowanie makro na dziś...
        const summary = mealData.reduce<DaySummary>(
          (acc, meal: any) => ({
            calories: acc.calories + Math.round(meal.calories || 0),
            protein: acc.protein + Math.round(meal.protein || 0),
            carbs: acc.carbs + Math.round(meal.carbs || 0),
            fat: acc.fat + Math.round(meal.fat || 0)
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        this.todaySummary.set(summary);
      }
    } catch (err) {
      console.error('Błąd ładowania danych dashboardu:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async logWeight(weight: number): Promise<boolean> {
    const {
      data: { user },
      error: authError
    } = await this.supabase.auth.getUser();
    if (authError || !user) return false;
    const userId = user.id;

    const todayStr = new Date().toISOString().split('T')[0];

    const { error: logError } = await this.supabase.from('new_weight_logs').insert({
      user_id: userId,
      weight: weight,
      date: todayStr,
      logged_at: new Date().toISOString()
    });

    if (logError) {
      console.error('Błąd zapisu wagi w logach:', logError);
      return false;
    }

    await this.supabase
    .from('new_profiles')
    .update({ weight: weight, updated_at: new Date().toISOString() })
    .eq('id', userId);

    await this.loadDashboardData();
    return true;
  }

  async toggleMealCompleted(mealId: string, completed: boolean): Promise<void> {
    const { error } = await this.supabase
    .from('new_meal_plans')
    .update({ completed })
    .eq('id', mealId);

    if (!error) {
      await this.loadDashboardData();
    } else {
      console.error('Błąd zmiany statusu posiłku:', error);
    }
  }
}
