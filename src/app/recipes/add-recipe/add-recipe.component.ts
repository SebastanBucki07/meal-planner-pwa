import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {NavbarComponent} from '../../components/navbar/navbar.component';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf} from '@angular/common';
import {Ingredient} from '../../services/recipe.service';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {environment} from '../../../environment';
import {IngredientRow, StepRow, Unit} from '../../models';

@Component({
  selector: 'app-add-recipe',
  imports: [
    NavbarComponent,
    FormsModule,
    NgIf,
    NgForOf
  ],
  templateUrl: './add-recipe.component.html',
  styleUrl: './add-recipe.component.scss'
})
export class AddRecipeComponent implements OnInit {
  private supabase: SupabaseClient;

  // Dane do kontrolek
  title: string = '';
  imageUrl: string = '';
  videoUrl: string = '';

  // Słowniki pobierane z Supabase
  availableIngredients: Ingredient[] = [];
  availableUnits: Unit[] = [];

  // Wiersze w formularzu
  ingredientRows: IngredientRow[] = [];
  stepRows: StepRow[] = [];

  constructor(private router: Router) {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit() {
    await Promise.all([
      this.fetchIngredients(),
      this.fetchUnits()
    ]);

    // Domyślne wiersze na start
    this.addIngredientRow();
    this.addStepRow();
  }

  // 1. Pobieranie danych z Supabase
  async fetchIngredients() {
    const {data, error} = await this.supabase
    .from('ingredients')
    .select('*')
    .order('name', {ascending: true});

    if (error) {
      console.error('Błąd pobierania składników:', error);
    } else if (data) {
      this.availableIngredients = data;
    }
  }

  async fetchUnits() {
    const {data, error} = await this.supabase
    .from('units')
    .select('*')
    .order('name', {ascending: true});

    if (error) {
      console.error('Błąd pobierania jednostek:', error);
    } else if (data) {
      this.availableUnits = data;
    }
  }

  // 2. Zarządzanie wierszami składników
  addIngredientRow() {
    const defaultUnit = this.availableUnits.length > 0 ? this.availableUnits[0].name : 'g';

    this.ingredientRows.push({
      ingredientId: '',
      name: '',
      amount: 100,
      unit: defaultUnit,
      unitMultiplier: 1, // <-- Dodaj to pole
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });
  }

  removeIngredientRow(index: number) {
    this.ingredientRows.splice(index, 1);
  }

  onIngredientChange(row: IngredientRow) {
    const selected = this.availableIngredients.find(ing => ing.id === row.ingredientId);
    if (selected) {
      row.name = selected.name;
    }
    this.calculateRowMacro(row);
  }

  onUnitChange(row: IngredientRow) {
    this.calculateRowMacro(row);
  }

  // 3. Przeliczanie makroskładników dla pojedynczego wiersza
  calculateRowMacro(row: IngredientRow) {
    const ingredient = this.availableIngredients.find(ing => ing.id === row.ingredientId);
    const unitObj = this.availableUnits.find(u => u.name === row.unit);

    if (!ingredient || !row.amount) {
      row.calories = 0;
      row.protein = 0;
      row.carbs = 0;
      row.fat = 0;
      return;
    }

    // Przelicznik jednostki na gramy (domyślnie 1)
    const multiplier = unitObj ? Number(unitObj.multiplier_to_grams) : 1;
    const totalGrams = row.amount * multiplier;

    // Przeliczenie wartości odżywczych na podstawie gramatury
    row.calories = Math.round((ingredient.calories_per_100g * totalGrams) / 100);
    row.protein = Number(((ingredient.protein_per_100g * totalGrams) / 100).toFixed(1));
    row.carbs = Number(((ingredient.carbs_per_100g * totalGrams) / 100).toFixed(1));
    row.fat = Number(((ingredient.fat_per_100g * totalGrams) / 100).toFixed(1));
  }

  // 4. Podsumowanie makro (Gettery do Live Preview)
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

  // 5. Zarządzanie krokami instrukcji
  addStepRow() {
    this.stepRows.push({
      stepNumber: this.stepRows.length + 1,
      instruction: ''
    });
  }

  removeStepRow(index: number) {
    this.stepRows.splice(index, 1);
    // Przeliczenie numerów kroków po usunięciu
    this.stepRows.forEach((step, idx) => step.stepNumber = idx + 1);
  }

  // 6. Zapis przepisu w Supabase
  async saveRecipe() {
    if (!this.title.trim()) return;

    // Przygotowanie danych do zapisu
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

    const {data, error} = await this.supabase
    .from('recipes')
    .insert([newRecipe]);

    if (error) {
      console.error('Błąd zapisu przepisu:', error);
      alert('Nie udało się zapisać przepisu. Sprawdź konsolę.');
    } else {
      console.log('Przepis zapisany pomyślnie:', data);
      this.router.navigate(['/recipes']);
    }
  }
}
