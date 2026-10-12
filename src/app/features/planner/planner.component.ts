import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';
import { MealPlan, MealType, Recipe } from '../../core/models';
import { RecipeMapper } from '../../core/mappers/recipe.mapper';
import { MealPlanMapper } from '../../core/mappers/meal-plan.mapper';

// Importy nowych pod-komponentów
import { PlannerCalendarComponent } from './components/planner-calendar/planner-calendar.component';
import { MealSlotComponent } from './components/meal-slot/meal-slot.component';
import { RecipeSelectModalComponent } from './components/recipe-select-modal/recipe-select-modal.component';
import { MacroSummaryComponent } from '../../shared/components/macro-summary/macro-summary.component';
import { RecipeDetailModalComponent } from '../../shared/components/recipe-detail-modal/recipe-detail-modal.component';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [
    CommonModule,
    PlannerCalendarComponent,
    MealSlotComponent,
    MacroSummaryComponent,
    RecipeSelectModalComponent,
    RecipeDetailModalComponent
  ],
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss'
})
export class PlannerComponent implements OnInit {
  private supabase: SupabaseClient;

  selectedDate = signal<Date>(new Date());
  selectedRecipeId = signal<string | null>(null);
  availableRecipes = signal<Recipe[]>([]);
  mealPlans = signal<MealPlan[]>([]);
  mealTypes: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Kolacja', 'Przekąska'];

  activeModalSlot = signal<MealType | null>(null);

  targetSummary = {
    calories: 2047,
    protein: 166,
    fat: 57,
    carbs: 218
  };

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit(): Promise<void> {
    await this.fetchRecipes();
    await this.fetchMealPlansForWeek();
  }

  weekDays = computed(() => {
    const current = new Date(this.selectedDate());
    const day = current.getDay();
    const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diffToMonday));

    const todayString = new Date().toISOString().split('T')[0];
    const selectedString = this.selectedDate().toISOString().split('T')[0];

    const days = [];
    const shortNames = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sob', 'Nd'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateString = d.toISOString().split('T')[0];

      days.push({
        date: d,
        name: shortNames[i],
        dayNumber: String(d.getDate()).padStart(2, '0'),
        monthNumber: String(d.getMonth() + 1).padStart(2, '0'),
        dateString: dateString,
        isSelected: dateString === selectedString,
        isToday: dateString === todayString
      });
    }
    return days;
  });

  weekRangeString = computed(() => {
    const days = this.weekDays();
    if (days.length < 7) return '';

    const start = days[0];
    const end = days[6];

    return `${start.dayNumber}.${start.monthNumber}.${start.date.getFullYear()} - ${end.dayNumber}.${end.monthNumber}.${end.date.getFullYear()}`;
  });

  goToToday(): void {
    this.selectedDate.set(new Date());
    this.fetchMealPlansForWeek();
  }

  selectDay(dateString: string): void {
    this.selectedDate.set(new Date(dateString));
  }

  previousWeek(): void {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() - 7);
    this.selectedDate.set(d);
    this.fetchMealPlansForWeek();
  }

  nextWeek(): void {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() + 7);
    this.selectedDate.set(d);
    this.fetchMealPlansForWeek();
  }

  async fetchRecipes(): Promise<void> {
    const { data, error } = await this.supabase.from('new_recipes').select('*');
    if (!error && data) {
      this.availableRecipes.set(data.map(dto => RecipeMapper.toDomain(dto)));
    }
  }

  async fetchMealPlansForWeek(): Promise<void> {
    const days = this.weekDays();
    const startDate = days[0].dateString;
    const endDate = days[6].dateString;

    const { data, error } = await this.supabase
      .from('new_meal_plans')
      .select(`*, new_recipes (*)`)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Błąd pobierania planu posiłków:', error);
    } else if (data) {
      this.mealPlans.set(MealPlanMapper.toDomainList(data));
    }
  }

  getMealsForSlot(dateString: string, mealType: MealType): MealPlan[] {
    return this.mealPlans().filter(p => p.date === dateString && p.mealType === mealType);
  }

  getDailySummary(dateString: string) {
    const dayMeals = this.mealPlans().filter(p => p.date === dateString);
    const summary = dayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        fat: acc.fat + (meal.fat || 0),
        carbs: acc.carbs + (meal.carbs || 0)
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    return {
      calories: Math.round(summary.calories),
      protein: Math.round(summary.protein),
      fat: Math.round(summary.fat),
      carbs: Math.round(summary.carbs)
    };
  }

  async selectRecipeForSlot(event: { recipeId: string; servings: number }): Promise<void> {
    const slot = this.activeModalSlot();
    const dateStr = this.selectedDate().toISOString().split('T')[0];

    if (slot && event && event.recipeId) {
      const recipe = this.availableRecipes().find(r => r.id === event.recipeId);
      if (!recipe) return;

      const chosenServings = event.servings;
      const baseServings = recipe.servings || 1;

      // Proporcjonalne przeliczenie makro i kalorii w zależności od wybranej liczby porcji
      const ratio = chosenServings / baseServings;

      const payload = MealPlanMapper.toInsertDto({
        date: dateStr,
        mealType: slot,
        recipeId: recipe.id,
        calories: Math.round(recipe.calories * ratio),
        protein: Number((recipe.protein * ratio).toFixed(1)),
        carbs: Number((recipe.carbs * ratio).toFixed(1)),
        fat: Number((recipe.fat * ratio).toFixed(1)),
        servings: chosenServings
      });

      const { error } = await this.supabase.from('new_meal_plans').insert([payload]);
      if (!error) {
        await this.fetchMealPlansForWeek();
      }
      this.activeModalSlot.set(null);
    }
  }

  async removeMeal(mealPlanId: any): Promise<void> {
    const { error } = await this.supabase.from('new_meal_plans').delete().eq('id', mealPlanId);
    if (!error) {
      await this.fetchMealPlansForWeek();
    }
  }
  openRecipeModal(recipeId?: string | null): void {
    if (recipeId) {
      this.selectedRecipeId.set(recipeId);
    }
  }

  closeRecipeModal(): void {
    this.selectedRecipeId.set(null);
  }
}
