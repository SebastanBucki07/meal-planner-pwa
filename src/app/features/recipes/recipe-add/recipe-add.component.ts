import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UnitMapper } from '../../../core/mappers/unit.mapper';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environment';
import { Ingredient, Unit, UnitDto } from '../../../core/models';

import { RecipeMapper } from '../../../core/mappers/recipe.mapper';

export interface RecipeIngredientFormRow {
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  unitMultiplier: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  searchText?: string;
  showDropdown?: boolean;
  filteredIngredients?: Ingredient[];
}

export interface RecipeStepFormRow {
  stepNumber: number;
  instruction: string;
}

@Component({
  selector: 'app-recipe-add',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './recipe-add.component.html',
  styleUrl: './recipe-add.component.scss'
})
export class RecipeAddComponent implements OnInit {
  private router = inject(Router);
  private supabase: SupabaseClient;

  // Pola formularza
  title: string = '';
  description: string = '';
  imageUrl: string = '';
  videoUrl: string = '';

  availableUnits: Unit[] = [];
  availableIngredients: Ingredient[] = [];

  // Tablice dynamiczne wierszy
  ingredientRows: RecipeIngredientFormRow[] = [];
  stepRows: RecipeStepFormRow[] = [];

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit(): Promise<void> {
    await this.fetchUnits();
    await this.fetchIngredients();

    // Dodaj domyślnie jeden pusty wiersz składnika i kroku na start
    this.addIngredientRow();
    this.addStepRow();
  }

  async fetchUnits(): Promise<void> {
    const { data, error } = await this.supabase
    .from('new_units')
    .select('*')
    .order('name', { ascending: true });

    if (error) {
      console.error('Błąd pobierania jednostek z new_units:', error);
    } else if (data) {
      this.availableUnits = UnitMapper.toDomainList(data as UnitDto[]);
    }
  }

  async fetchIngredients(): Promise<void> {
    const { data, error } = await this.supabase
    .from('new_ingredients') // Dostosuj nazwę tabeli ze składnikami jeśli jest inna, np. 'new_ingredients'
    .select('*')
    .order('name', { ascending: true });

    if (error) {
      console.error('Błąd pobierania składników:', error);
    } else if (data) {
      this.availableIngredients = data as Ingredient[];
    }
  }

  // --- Zarządzanie wierszami składników ---

  addIngredientRow(): void {
    this.ingredientRows.push({
      ingredientId: '',
      name: '',
      amount: 0,
      unit: this.availableUnits[0]?.name || 'g',
      unitMultiplier: 1,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      searchText: '',
      showDropdown: false,
      filteredIngredients: []
    });
  }

  removeIngredientRow(index: number): void {
    this.ingredientRows.splice(index, 1);
  }

  onSearchInput(row: RecipeIngredientFormRow): void {
    const query = (row.searchText || '').toLowerCase();
    if (!query) {
      row.filteredIngredients = [];
      row.showDropdown = false;
      return;
    }
    row.filteredIngredients = this.availableIngredients.filter(ing =>
      ing.name.toLowerCase().includes(query)
    );
    row.showDropdown = true;
  }

  onInputFocus(row: RecipeIngredientFormRow): void {
    if (row.searchText) {
      row.showDropdown = true;
    }
  }

  onInputBlur(row: RecipeIngredientFormRow): void {
    // Opóźnienie, aby zdarzenie mousedown na elemencie listy zdążyło się wykonać
    setTimeout(() => {
      row.showDropdown = false;
    }, 200);
  }

  selectIngredient(row: RecipeIngredientFormRow, ingredient: Ingredient): void {
    row.ingredientId = ingredient.id;
    row.name = ingredient.name;
    row.searchText = ingredient.name;
    row.showDropdown = false;
    this.calculateRowMacro(row);
  }

  onIngredientChange(row: RecipeIngredientFormRow): void {
    this.calculateRowMacro(row);
  }

  onUnitChange(row: RecipeIngredientFormRow): void {
    this.calculateRowMacro(row);
  }

  calculateRowMacro(row: RecipeIngredientFormRow): void {
    const ingredient: any = this.availableIngredients.find((ing: any) => ing.id === row.ingredientId);
    const unitObj = this.availableUnits.find((u: Unit) => u.name === row.unit);

    if (!ingredient || !row.amount) {
      row.calories = 0;
      row.protein = 0;
      row.carbs = 0;
      row.fat = 0;
      return;
    }

    const multiplier = unitObj ? unitObj.multiplierToGrams : 1;
    row.unitMultiplier = multiplier;
    const totalGrams = row.amount * multiplier;

    const calPer100 = ingredient.calories_per_100g ?? ingredient.caloriesPer100g ?? 0;
    const protPer100 = ingredient.protein_per_100g ?? ingredient.proteinPer100g ?? 0;
    const carbsPer100 = ingredient.carbs_per_100g ?? ingredient.carbsPer100g ?? 0;
    const fatPer100 = ingredient.fat_per_100g ?? ingredient.fatPer100g ?? 0;

    row.calories = Math.round((calPer100 * totalGrams) / 100);
    row.protein = Number(((protPer100 * totalGrams) / 100).toFixed(1));
    row.carbs = Number(((carbsPer100 * totalGrams) / 100).toFixed(1));
    row.fat = Number(((fatPer100 * totalGrams) / 100).toFixed(1));
  }

  // --- Zarządzanie krokami przygotowania ---

  addStepRow(): void {
    this.stepRows.push({
      stepNumber: this.stepRows.length + 1,
      instruction: ''
    });
  }

  removeStepRow(index: number): void {
    this.stepRows.splice(index, 1);
    // Przelumeruj kroki na nowo
    this.stepRows.forEach((step, idx) => {
      step.stepNumber = idx + 1;
    });
  }

  // --- Podsumowania makro (gettery) ---

  get totalCalories(): number {
    return this.ingredientRows.reduce((sum, row) => sum + (row.calories || 0), 0);
  }

  get totalProtein(): number {
    return Number(this.ingredientRows.reduce((sum, row) => sum + (row.protein || 0), 0).toFixed(1));
  }

  get totalCarbs(): number {
    return Number(this.ingredientRows.reduce((sum, row) => sum + (row.carbs || 0), 0).toFixed(1));
  }

  get totalFat(): number {
    return Number(this.ingredientRows.reduce((sum, row) => sum + (row.fat || 0), 0).toFixed(1));
  }

  // --- Zapis do bazy ---

  async saveRecipe(): Promise<void> {
    if (!this.title.trim()) {
      alert('Podaj tytuł przepisu!');
      return;
    }

    const instructionsCombined = this.stepRows
    .filter(step => step.instruction.trim() !== '')
    .map((step, index) => `Krok ${index + 1}: ${step.instruction}`)
    .join('\n');

    const recipePayload = RecipeMapper.toInsertDto({
      title: this.title,
      description: this.description,
      instructions: instructionsCombined,
      imageUrl: this.imageUrl,
      videoUrl: this.videoUrl,
      calories: this.totalCalories,
      protein: this.totalProtein,
      carbs: this.totalCarbs,
      fat: this.totalFat
    });

    // 1. Zapisz główny przepis i pobierz jego nowe ID
    const { data: insertedRecipe, error: recipeError } = await this.supabase
    .from('new_recipes')
    .insert([recipePayload])
    .select('id')
    .single();

    if (recipeError || !insertedRecipe) {
      console.error('Błąd podczas zapisywania przepisu:', recipeError);
      alert('Nie udało się zapisać przepisu.');
      return;
    }

    const recipeId = insertedRecipe.id;

    // 2. Przygotuj wiersze składników do tabeli łącznikowej `new_recipe_ingredients`
    const validIngredients = this.ingredientRows
    .filter(row => row.ingredientId && row.amount > 0)
    .map(row => {
      const unitObj = this.availableUnits.find(u => u.name === row.unit);
      const multiplier = unitObj ? unitObj.multiplierToGrams : 1;

      return {
        recipe_id: recipeId,
        ingredient_id: row.ingredientId,
        amount: row.amount, // <--- Czysta liczba z formularza (np. 1)
        amount_in_grams: row.amount * multiplier, // <--- Waga w gramach (np. 150)
        unit: row.unit || 'g'
      };
    });

    // 3. Wstaw powiązane składniki, jeśli zostały wybrane
    if (validIngredients.length > 0) {
      const { error: ingredientsError } = await this.supabase
      .from('new_recipe_ingredients')
      .insert(validIngredients);

      if (ingredientsError) {
        console.error('Błąd podczas zapisywania składników przepisu:', ingredientsError);
        alert('Przepis został zapisany, ale wystąpił błąd przy zapisie składników.');
        return;
      }
    }

    console.log('Przepis i składniki zapisane pomyślnie!');
    this.router.navigate(['/recipes']);
  }
}
