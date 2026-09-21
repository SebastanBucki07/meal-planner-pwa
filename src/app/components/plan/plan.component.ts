import { Component, OnInit } from '@angular/core';
import {SupabaseService} from '../../services/supabase.service';
import {NavbarComponent} from '../navbar/navbar.component';
import {CommonModule} from '@angular/common';

export interface WeekDay {
  date: Date;
  dateStr: string;     // Format 'YYYY-MM-DD'
  fullDateStr: string; // Format 'DD.MM'
  dayName: string;     // 'Pn', 'Wt', itp.
  isToday: boolean;
}

export interface PlannedMeal {
  id: string;
  date: string;
  mealType: string;
  recipeId: string;
  recipeName: string;
  imageUrl?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

// Zmień nazwę z Recipe na PlanRecipe
export interface PlanRecipe {
  id: string;
  title: string;
  image_url?: string;
  calories: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  description?: string;
  instructions?: string;
}




@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss']
})
export class PlanComponent implements OnInit {
  loading: boolean = false;

  readonly mealTypes: string[] = [
    'Śniadanie',
    'II śniadanie',
    'Obiad',
    'Kolacja',
    'Przekąska'
  ];

  weekOffset: number = 0;
  currentWeekRangeText: string = '';
  selectedDate: string = '';
  weekDays: WeekDay[] = [];

  dayMeals: PlannedMeal[] = [];

  // Docelowe makroskładniki (domyślne lub pobierane z bazy z profilu)
  targetCalories: number = 2500;
  targetProtein: number = 160;
  targetFat: number = 80;
  targetCarbs: number = 280;

  // Modale
  isModalOpen: boolean = false;
  isPreviewOpen: boolean = false;
  selectedMealType: string = '';
  availableRecipes: PlanRecipe[] = [];
  selectedRecipeForPreview: PlanRecipe | null = null;

  constructor(private supabase: SupabaseService) {}

  ngOnInit(): void {
    const today = new Date();
    this.selectedDate = this.formatDateToString(today);
    this.generateWeek(0);
    this.loadUserProfileTargets();
    this.loadPlanForSelectedDate();
  }

  async loadUserProfileTargets(): Promise<void> {
    try {
      const { data: authData } = await this.supabase.client.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return;

      const { data, error } = await this.supabase.client
      .from('profiles')
      .select('target_calories, target_protein, target_fat, target_carbs')
      .eq('id', userId)
      .single();

      if (data && !error) {
        if (data.target_calories) this.targetCalories = data.target_calories;
        if (data.target_protein) this.targetProtein = data.target_protein;
        if (data.target_fat) this.targetFat = data.target_fat;
        if (data.target_carbs) this.targetCarbs = data.target_carbs;
      }
    } catch (e) {
      console.log('Używam domyślnych celów makro');
    }
  }

  goToToday(): void {
    this.weekOffset = 0;
    this.generateWeek(0);
    const today = new Date();
    this.selectDate(this.formatDateToString(today));
  }

  // Metody obliczające procentowe zapełnienie paska postępu
  getCaloriesPercent(): number {
    return Math.min(Math.round((this.dayCalories / this.targetCalories) * 100), 100);
  }

  getProteinPercent(): number {
    return Math.min(Math.round((this.dayProtein / this.targetProtein) * 100), 100);
  }

  getFatPercent(): number {
    return Math.min(Math.round((this.dayFat / this.targetFat) * 100), 100);
  }

  getCarbsPercent(): number {
    return Math.min(Math.round((this.dayCarbs / this.targetCarbs) * 100), 100);
  }

  private mealTypeToDbKey(type: string): string {
    const map: Record<string, string> = {
      'Śniadanie': 'Śniadanie',
      'II śniadanie': 'Drugie Śniadanie',
      'Obiad': 'Obiad',
      'Kolacja': 'Kolacja',
      'Przekąska': 'Przekąska'
    };
    return map[type] || type;
  }

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

  changeWeek(offsetChange: number): void {
    const newOffset = this.weekOffset + offsetChange;
    if (newOffset < -1 || newOffset > 2) return;

    this.weekOffset = newOffset;
    this.generateWeek(this.weekOffset);

    if (this.weekDays.length > 0) {
      this.selectDate(this.weekDays[0].dateStr);
    }
  }

  generateWeek(offset: number): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() + distanceToMonday);

    const targetMonday = new Date(currentMonday);
    targetMonday.setDate(currentMonday.getDate() + (offset * 7));

    this.weekDays = [];
    const dayNamesShort = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sob', 'Nd'];
    const todayStr = this.formatDateToString(today);

    for (let i = 0; i < 7; i++) {
      const d = new Date(targetMonday);
      d.setDate(targetMonday.getDate() + i);

      const dateStr = this.formatDateToString(d);
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');

      this.weekDays.push({
        date: d,
        dateStr: dateStr,
        fullDateStr: `${dayNum}.${monthNum}`,
        dayName: dayNamesShort[i],
        isToday: dateStr === todayStr
      });
    }

    const startStr = this.weekDays[0].fullDateStr;
    const endStr = this.weekDays[6].fullDateStr;
    const year = targetMonday.getFullYear();
    this.currentWeekRangeText = `${startStr}.${year} - ${endStr}.${year}`;
  }

  selectDate(dateStr: string): void {
    this.selectedDate = dateStr;
    this.loadPlanForSelectedDate();
  }

  async loadPlanForSelectedDate(): Promise<void> {
    this.loading = true;
    try {
      const { data: authData } = await this.supabase.client.auth.getUser();
      const userId = authData.user?.id;

      let query = this.supabase.client
      .from('meal_plans')
      .select(`
          id,
          date,
          meal_type,
          recipe_id,
          user_id,
          recipes (
            id,
            title,
            image_url,
            calories,
            protein,
            fat,
            carbs,
            description,
            instructions
          )
        `)
      .eq('date', this.selectedDate);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Błąd podczas pobierania planu:', error);
        this.dayMeals = [];
        return;
      }

      this.dayMeals = (data || []).map((item: any) => {
        const recipe = item.recipes || {};
        return {
          id: item.id,
          date: item.date,
          mealType: this.dbKeyToMealType(item.meal_type),
          recipeId: item.recipe_id,
          recipeName: recipe.title || 'Nieznany przepis',
          imageUrl: recipe.image_url,
          calories: Math.round(recipe.calories || 0),
          protein: Math.round(recipe.protein || 0),
          fat: Math.round(recipe.fat || 0),
          carbs: Math.round(recipe.carbs || 0)
        };
      });
    } catch (err) {
      console.error('Błąd połączenia:', err);
    } finally {
      this.loading = false;
    }
  }

  getMealsForType(mealType: string): PlannedMeal[] {
    return this.dayMeals.filter(m => m.mealType.toLowerCase() === mealType.toLowerCase());
  }

  get dayCalories(): number {
    return Math.round(this.dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0));
  }

  get dayProtein(): number {
    return Math.round(this.dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0));
  }

  get dayCarbs(): number {
    return Math.round(this.dayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0));
  }

  get dayFat(): number {
    return Math.round(this.dayMeals.reduce((sum, m) => sum + (m.fat || 0), 0));
  }

  async openRecipePreview(recipeId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

      if (error || !data) {
        console.error('Błąd podczas pobierania podglądu przepisu:', error);
        return;
      }

      this.selectedRecipeForPreview = data;
      this.isPreviewOpen = true;
    } catch (err) {
      console.error('Błąd podglądu:', err);
    }
  }

  closePreviewModal(): void {
    this.isPreviewOpen = false;
    this.selectedRecipeForPreview = null;
  }

  openAddMealModal(mealType: string): void {
    this.selectedMealType = mealType;
    this.isModalOpen = true;
    this.loadAvailableRecipes();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedMealType = '';
  }

  async loadAvailableRecipes(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
      .from('recipes')
      .select('id, title, image_url, calories, protein, fat, carbs')
      .order('title', { ascending: true });

      if (error) {
        console.error('Błąd pobierania przepisów:', error);
        this.availableRecipes = [];
        return;
      }

      this.availableRecipes = data || [];
    } catch (err) {
      console.error('Błąd połączenia:', err);
    }
  }

  async addMealToPlan(recipeId: string): Promise<void> {
    try {
      const { data: authData } = await this.supabase.client.auth.getUser();
      const userId = authData.user?.id;

      const payload: any = {
        date: this.selectedDate,
        meal_type: this.mealTypeToDbKey(this.selectedMealType),
        recipe_id: recipeId
      };

      if (userId) {
        payload.user_id = userId;
      }

      const { error } = await this.supabase.client
      .from('meal_plans')
      .insert([payload]);

      if (error) {
        console.error('Błąd podczas dodawania posiłku do planu:', error);
        alert('Błąd dodawania posiłku. Upewnij się, że wybór jest poprawny.');
        return;
      }

      await this.loadPlanForSelectedDate();
      this.closeModal();
    } catch (err) {
      console.error('Błąd zapisu:', err);
    }
  }

  async removeMeal(mealId: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      const { error } = await this.supabase.client
      .from('meal_plans')
      .delete()
      .eq('id', mealId);

      if (error) {
        console.error('Błąd podczas usuwania posiłku:', error);
        return;
      }

      this.dayMeals = this.dayMeals.filter(m => m.id !== mealId);
    } catch (err) {
      console.error('Błąd usuwania:', err);
    }
  }

  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
