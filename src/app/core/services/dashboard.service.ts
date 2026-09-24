import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { NewWeightLogDTO, WeightEntry } from '../models';
import { DaySummary, MealLogDTO, DashboardMealItem } from '../models/dashboard.model';
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

      const { data: weightData, error: weightError } = await this.supabase
        .from('new_weight_logs')
        .select('id, user_id, weight, date, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true })
        .limit(30);

      if (!weightError && weightData) {
        const dtoList = weightData as NewWeightLogDTO[];
        const domainList: WeightEntry[] = dtoList.map(dto => {
          // Sformatowanie daty z logged_at lub date
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

      // 2. Dzisiejsze posiłki
      const { data: mealData, error: mealError } = await this.supabase
        .from('new_meal_logs')
        .select('id, name, calories, protein, carbs, fat, completed')
        .eq('user_id', user.id)
        .eq('date', todayStr);

      if (!mealError && mealData) {
        const dtoList = mealData as MealLogDTO[];

        const mealsList: DashboardMealItem[] = dtoList.map(dto => ({
          id: dto.id || '',
          name: dto.name || 'Posiłek',
          calories: dto.calories || 0,
          completed: !!dto.completed
        }));
        this.todayMeals.set(mealsList);

        const summary = dtoList.reduce<DaySummary>(
          (acc, meal) => ({
            calories: acc.calories + (meal.calories || 0),
            protein: acc.protein + (meal.protein || 0),
            carbs: acc.carbs + (meal.carbs || 0),
            fat: acc.fat + (meal.fat || 0)
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        this.todaySummary.set(summary);
      }
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

    // 1. Zapisz wpis w historii (new_weight_logs).
    // Uwaga: Sprawdź, czy w Twojej tabeli kolumna z datą nazywa się 'recorded_at', 'logged_at' czy 'date'!
    // Poniżej używamy 'date' oraz 'logged_at' zależnie od tego, co masz w bazie. Bezpieczniej wysłać te, które wymagane są przez DTO.
    const { error: logError } = await this.supabase.from('new_weight_logs').insert({
      user_id: userId,
      weight: weight,
      date: todayStr, // Jeśli Twoja tabela używa kolumny 'date'
      logged_at: new Date().toISOString() // Jeśli używa 'logged_at' / 'recorded_at'
    });

    if (logError) {
      console.error('Błąd zapisu wagi w logach:', logError);
      return false;
    }

    // 2. Zaktualizuj też kolumnę weight w new_profiles (dla cache)
    await this.supabase
      .from('new_profiles')
      .update({ weight: weight, updated_at: new Date().toISOString() })
      .eq('id', userId);

    // 3. Odśwież dane na dashboardzie, żeby wykres natychmiast się zaktualizował
    await this.loadDashboardData();

    return true;
  }

  async toggleMealCompleted(mealId: string, completed: boolean): Promise<void> {
    await this.supabase.from('new_meal_logs').update({ completed }).eq('id', mealId);

    await this.loadDashboardData();
  }
}
