import {Component, OnInit} from '@angular/core';
import {SupabaseService} from '../../services/supabase.service';
import {NavbarComponent} from '../navbar/navbar.component';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {WeekDay} from '../../models';
import {MEAL_TYPES} from '../../models/mealTypes.model';
import {dbKeyToMealType} from '../../helpers/mealType.helper';
import {RecipeStep} from '../../models/recipeStep.model';

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

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  instructions?: string;
  created_at: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url?: string;
  video_url?: string;
  ingredients_list: Ingredient[];
  steps: RecipeStep[];
}

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FormsModule],
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss']
})
export class PlanComponent implements OnInit {
  loading: boolean = false;
  weekOffset: number = 0;
  currentWeekRangeText: string = '';
  selectedDate: string = '';
  weekDays: WeekDay[] = [];
  dayMeals: PlannedMeal[] = [];
  targetCalories: number = 2500;
  targetProtein: number = 160;
  targetFat: number = 80;
  targetCarbs: number = 280;

  // Modale
  isModalOpen: boolean = false;
  isPreviewOpen: boolean = false;
  selectedMealType: string = '';
  selectedRecipeForPreview: PlanRecipe | null = null;

  // Logika listy przepisów i filtrowania
  availableRecipes: PlanRecipe[] = [];
  filteredRecipes: PlanRecipe[] = [];
  searchTerm: string = '';
  maxCalories: number | null = null;
  minProtein: number | null = null;
  minCarbs: number | null = null;
  minFat: number | null = null;

  constructor(private supabase: SupabaseService) {
  }

  ngOnInit(): void {
    const today = new Date();
    this.selectedDate = this.formatDateToString(today);
    this.generateWeek(0);
    this.loadUserProfileTargets();
    this.loadPlanForSelectedDate();
  }

  applyFilter(): void {
    let recipes = [...this.availableRecipes];

    // Filtr po nazwie
    if (this.searchTerm) {
      const lowerCaseSearch = this.searchTerm.toLowerCase();
      recipes = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(lowerCaseSearch)
      );
    }

    // Filtr po kaloriach (max)
    if (this.maxCalories !== null && this.maxCalories > 0) {
      recipes = recipes.filter(recipe => recipe.calories <= this.maxCalories!);
    }

    // Filtr po białku (min)
    if (this.minProtein !== null && this.minProtein > 0) {
      recipes = recipes.filter(recipe => (recipe.protein || 0) >= this.minProtein!);
    }

    // Filtr po węglowodanach (min)
    if (this.minCarbs !== null && this.minCarbs > 0) {
      recipes = recipes.filter(recipe => (recipe.carbs || 0) >= this.minCarbs!);
    }

    // Filtr po tłuszczach (min)
    if (this.minFat !== null && this.minFat > 0) {
      recipes = recipes.filter(recipe => (recipe.fat || 0) >= this.minFat!);
    }

    this.filteredRecipes = recipes;
  }

  openAddMealModal(mealType: string): void {
    this.selectedMealType = mealType;
    this.isModalOpen = true;
    // Resetuj wszystkie filtry
    this.searchTerm = '';
    this.maxCalories = null;
    this.minProtein = null;
    this.minCarbs = null;
    this.minFat = null;
    this.loadAvailableRecipes();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedMealType = '';
    this.availableRecipes = [];
    this.filteredRecipes = [];
  }

  async loadAvailableRecipes(): Promise<void> {
    try {
      const {data, error} = await this.supabase.client
      .from('recipes')
      .select('id, title, image_url, calories, protein, fat, carbs')
      .order('title', {ascending: true});

      if (error) {
        console.error('Błąd pobierania przepisów:', error);
        this.availableRecipes = [];
      } else {
        this.availableRecipes = data || [];
      }
      this.applyFilter();
    } catch (err) {
      console.error('Błąd połączenia:', err);
    }
  }

  // Reszta metod bez zmian
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

  async addMealToPlan(recipeId: string): Promise<void> {
    try {
      const {data: authData} = await this.supabase.client.auth.getUser();
      const userId = authData.user?.id;
      const payload: any = {
        date: this.selectedDate,
        meal_type: this.mealTypeToDbKey(this.selectedMealType),
        recipe_id: recipeId
      };
      if (userId) {
        payload.user_id = userId;
      }

      const {error} = await this.supabase.client.from('meal_plans').insert([payload]);
      if (error) {
        throw error;
      }

      await this.loadPlanForSelectedDate();
      this.closeModal();
    } catch (error) {
      console.error('Błąd podczas dodawania posiłku do planu:', error);
      alert('Błąd dodawania posiłku. Upewnij się, że wybór jest poprawny.');
    }
  }

  async openRecipePreview(recipeId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .returns<Recipe>() // <-- Poprawne typowanie w Supabase v2
      .single();

      if (error) {
        throw error;
      }

      this.selectedRecipeForPreview = data;
      this.isPreviewOpen = true;
    } catch (err) {
      console.error('Błąd podczas pobierania podglądu przepisu:', err);
    }
  }

  closePreviewModal(): void {
    this.isPreviewOpen = false;
    this.selectedRecipeForPreview = null;
  }

  async removeMeal(mealId: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      const {error} = await this.supabase.client.from('meal_plans').delete().eq('id', mealId);
      if (error) {
        throw error;
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

  async loadUserProfileTargets(): Promise<void> {
    try {
      const {data: authData} = await this.supabase.client.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return;

      const {data, error} = await this.supabase.client
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
      const {data: authData} = await this.supabase.client.auth.getUser();
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

      const {data, error} = await query;

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
          mealType: dbKeyToMealType(item.meal_type),
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

  protected readonly MEAL_TYPES = MEAL_TYPES;
}
