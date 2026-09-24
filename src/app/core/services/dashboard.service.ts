import {Injectable, signal, computed, inject} from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { NewWeightLogDTO, WeightEntry } from '../models';
import { DaySummary, MealLogDTO, DashboardMealItem } from '../models/dashboard.model';
import { environment } from '../../../environment';
import {ProfileService} from './profile.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private supabase: SupabaseClient;
  private profileService = inject(ProfileService);

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
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return false;

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Zapis do tabeli historycznej logów wagi
    const { error: logError } = await this.supabase
    .from('new_weight_logs')
    .insert({ user_id: user.id, weight, date: todayStr });

    if (logError) {
      console.error('Błąd zapisu w historycznych logach wagi:', logError);
      return false;
    }

    // 2. Aktualizacja wagi oraz PRZELICZENIE CELÓW KALORYCZNYCH w tabeli new_profiles
    await this.profileService.updateWeightAndRecalculateTargets(weight);

    // 3. Odświeżenie danych na dashboardzie
    await this.loadDashboardData();

    return true;
  }

  async toggleMealCompleted(mealId: string, completed: boolean): Promise<void> {
    await this.supabase.from('new_meal_logs').update({ completed }).eq('id', mealId);

    await this.loadDashboardData();
  }
}
