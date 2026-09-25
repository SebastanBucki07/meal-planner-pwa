import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';
import { MealPlan, MealType, Recipe } from '../../core/models';
import { RecipeMapper } from '../../core/mappers/recipe.mapper';
import { MealPlanMapper } from '../../core/mappers/meal-plan.mapper';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss'
})
export class PlannerComponent implements OnInit {
  private supabase: SupabaseClient;

  selectedDate = signal<Date>(new Date());
  availableRecipes = signal<Recipe[]>([]);
  mealPlans = signal<MealPlan[]>([]);
  mealTypes: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Kolacja', 'Przekąska'];

  // Stan Modalu i Filtrów
  activeModalSlot = signal<MealType | null>(null);
  searchQuery = signal<string>('');
  filterMaxKcal = signal<number | null>(null);
  filterMinProtein = signal<number | null>(null);
  filterMinCarbs = signal<number | null>(null);
  filterMinFat = signal<number | null>(null);

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
    const yearStart = start.date.getFullYear();
    const yearEnd = end.date.getFullYear();

    return `${start.dayNumber}.${start.monthNumber}.${yearStart} - ${end.dayNumber}.${end.monthNumber}.${yearEnd}`;
  });

  filteredRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const maxKcal = this.filterMaxKcal();
    const minProtein = this.filterMinProtein();
    const minCarbs = this.filterMinCarbs();
    const minFat = this.filterMinFat();

    return this.availableRecipes().filter(r => {
      const matchesQuery = !query || r.title.toLowerCase().includes(query);
      const matchesKcal = maxKcal === null || maxKcal === undefined || r.calories <= maxKcal;
      const matchesProtein = minProtein === null || minProtein === undefined || r.protein >= minProtein;
      const matchesCarbs = minCarbs === null || minCarbs === undefined || r.carbs >= minCarbs;
      const matchesFat = minFat === null || minFat === undefined || r.fat >= minFat;

      return matchesQuery && matchesKcal && matchesProtein && matchesCarbs && matchesFat;
    });
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
    .select(`
        *,
        new_recipes (*)
      `)
    .gte('date', startDate)
    .lte('date', endDate);

    if (error) {
      console.error('Błąd pobierania planu posiłków:', error);
    } else if (data) {
      this.mealPlans.set(MealPlanMapper.toDomainList(data));
    }
  }

  getMealsForSlot(dateString: string, mealType: MealType): MealPlan[] {
    return this.mealPlans().filter(
      p => p.date === dateString && p.mealType === mealType
    );
  }

  // Zaokrąglanie wartości do liczb całkowitych (eliminuje np. 21.800000000000004)
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

  getPercent(current: number, target: number): number {
    if (!target) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  }

  // Obsługa uszkodzonych linków do obrazków
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const sibling = img.nextElementSibling as HTMLElement;
    if (sibling) {
      sibling.style.display = 'flex';
    }
  }

  openAddModal(mealType: MealType): void {
    this.activeModalSlot.set(mealType);
  }

  closeModal(): void {
    this.activeModalSlot.set(null);
    this.searchQuery.set('');
    this.filterMaxKcal.set(null);
    this.filterMinProtein.set(null);
    this.filterMinCarbs.set(null);
    this.filterMinFat.set(null);
  }

  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  async selectRecipeForSlot(recipeId: string): Promise<void> {
    const slot = this.activeModalSlot();
    const dateStr = this.selectedDate().toISOString().split('T')[0];

    if (slot) {
      await this.assignRecipe(dateStr, slot, recipeId);
      this.closeModal();
    }
  }

  async assignRecipe(dateString: string, mealType: MealType, recipeId: string): Promise<void> {
    if (!recipeId) return;

    const recipe = this.availableRecipes().find(r => r.id === recipeId);
    if (!recipe) return;

    const payload = MealPlanMapper.toInsertDto({
      date: dateString,
      mealType: mealType,
      recipeId: recipe.id,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      servings: 1
    });

    const { error } = await this.supabase
    .from('new_meal_plans')
    .insert([payload]);

    if (error) {
      console.error('Błąd dodawania posiłku:', error);
    } else {
      await this.fetchMealPlansForWeek();
    }
  }

  async removeMeal(mealPlanId: any): Promise<void> {
    const { error } = await this.supabase
    .from('new_meal_plans')
    .delete()
    .eq('id', mealPlanId);

    if (!error) {
      await this.fetchMealPlansForWeek();
    } else {
      console.error('Błąd usuwania posiłku:', error);
    }
  }


}
