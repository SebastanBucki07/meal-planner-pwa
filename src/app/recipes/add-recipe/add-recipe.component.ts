import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FormsModule } from '@angular/forms';
import { NgForOf, NgIf } from '@angular/common';
import { Ingredient } from '../../services/recipe.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';

// Import oryginalnego modelu
import { IngredientRow, StepRow, Unit } from '../../models';

// Rozszerzenie modelu o pola lokalne UI dla Autocomplete (nie modyfikuje pliku w models)
export interface RecipeIngredientFormRow extends IngredientRow {
  searchText?: string;
  showDropdown?: boolean;
  filteredIngredients?: Ingredient[];
}

@Component({
  selector: 'app-add-recipe',
  standalone: true,
  imports: [NavbarComponent, FormsModule, NgIf, NgForOf],
  templateUrl: './add-recipe.component.html',
  styleUrl: './add-recipe.component.scss'
})
export class AddRecipeComponent implements OnInit {
  private supabase: SupabaseClient;

  title = '';
  imageUrl = '';
  videoUrl = '';

  availableIngredients: Ingredient[] = [];
  availableUnits: Unit[] = [];

  ingredientRows: RecipeIngredientFormRow[] = [];
  stepRows: StepRow[] = [];

  constructor(private router: Router) {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit() {
    await Promise.all([this.fetchIngredients(), this.fetchUnits()]);
    this.addIngredientRow();
    this.addStepRow();
  }

  async fetchIngredients() {
    const { data, error } = await this.supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Błąd pobierania składników:', error);
    } else if (data) {
      this.availableIngredients = data;
    }
  }

  async fetchUnits() {
    const { data, error } = await this.supabase
      .from('units')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Błąd pobierania jednostek:', error);
    } else if (data) {
      this.availableUnits = data;
    }
  }

  addIngredientRow() {
    const defaultUnit = this.availableUnits.length > 0 ? this.availableUnits[0].name : 'g';

    this.ingredientRows.push({
      ingredientId: '',
      name: '',
      amount: 100,
      unit: defaultUnit,
      unitMultiplier: 1, // Wymagane przez oryginalny interfejs IngredientRow
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      searchText: '',
      showDropdown: false,
      filteredIngredients: []
    });
  }

  removeIngredientRow(index: number) {
    this.ingredientRows.splice(index, 1);
  }

  // Metody Autocomplete dla szablonu HTML
  onInputFocus(row: RecipeIngredientFormRow) {
    row.showDropdown = true;
    this.filterIngredients(row);
  }

  onInputBlur(row: RecipeIngredientFormRow) {
    setTimeout(() => {
      row.showDropdown = false;
    }, 150);
  }

  onSearchInput(row: RecipeIngredientFormRow) {
    row.showDropdown = true;
    if (row.name !== row.searchText) {
      row.ingredientId = '';
      row.name = '';
      this.calculateRowMacro(row);
    }
    this.filterIngredients(row);
  }

  filterIngredients(row: RecipeIngredientFormRow) {
    const query = (row.searchText || '').toLowerCase().trim();
    if (!query) {
      row.filteredIngredients = this.availableIngredients.slice(0, 10);
    } else {
      row.filteredIngredients = this.availableIngredients
        .filter(ing => ing.name.toLowerCase().includes(query))
        .slice(0, 10);
    }
  }

  selectIngredient(row: RecipeIngredientFormRow, ingredient: Ingredient) {
    row.ingredientId = ingredient.id;
    row.name = ingredient.name;
    row.searchText = ingredient.name;
    row.showDropdown = false;

    this.calculateRowMacro(row);
  }

  onIngredientChange(row: RecipeIngredientFormRow) {
    this.calculateRowMacro(row);
  }

  onUnitChange(row: RecipeIngredientFormRow) {
    this.calculateRowMacro(row);
  }

  calculateRowMacro(row: RecipeIngredientFormRow) {
    const ingredient = this.availableIngredients.find(ing => ing.id === row.ingredientId);
    const unitObj = this.availableUnits.find(u => u.name === row.unit);

    if (!ingredient || !row.amount) {
      row.calories = 0;
      row.protein = 0;
      row.carbs = 0;
      row.fat = 0;
      return;
    }

    const multiplier = unitObj ? Number(unitObj.multiplier_to_grams) : 1;
    row.unitMultiplier = multiplier;
    const totalGrams = row.amount * multiplier;

    row.calories = Math.round((ingredient.calories_per_100g * totalGrams) / 100);
    row.protein = Number(((ingredient.protein_per_100g * totalGrams) / 100).toFixed(1));
    row.carbs = Number(((ingredient.carbs_per_100g * totalGrams) / 100).toFixed(1));
    row.fat = Number(((ingredient.fat_per_100g * totalGrams) / 100).toFixed(1));
  }

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

  addStepRow() {
    this.stepRows.push({
      stepNumber: this.stepRows.length + 1,
      instruction: ''
    });
  }

  removeStepRow(index: number) {
    this.stepRows.splice(index, 1);
    this.stepRows.forEach((step, idx) => (step.stepNumber = idx + 1));
  }

  async saveRecipe() {
    if (!this.title.trim()) return;

    const preparedIngredients = this.ingredientRows
      .filter(row => row.ingredientId)
      .map(row => ({
        ingredient_id: row.ingredientId,
        name: row.name,
        amount: row.amount,
        unit: row.unit,
        calories: row.calories,
        protein: row.protein,
        carbs: row.carbs,
        fat: row.fat
      }));

    const preparedSteps = this.stepRows
      .filter(step => step.instruction.trim() !== '')
      .map(step => ({
        step_number: step.stepNumber,
        instruction: step.instruction
      }));

    const newRecipe = {
      title: this.title,
      image_url: this.imageUrl || null,
      video_url: this.videoUrl || null,
      ingredients_list: preparedIngredients,
      steps: preparedSteps,
      calories: this.totalCalories,
      protein: this.totalProtein,
      carbs: this.totalCarbs,
      fat: this.totalFat
    };

    const { error } = await this.supabase.from('recipes').insert([newRecipe]);

    if (error) {
      console.error('Błąd zapisu przepisu:', error);
      alert('Nie udało się zapisać przepisu.');
    } else {
      this.router.navigate(['/recipes']);
    }
  }
}
