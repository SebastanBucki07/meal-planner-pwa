import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environment';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-recipe-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recipe-detail-modal.component.html',
  styleUrls: ['./recipe-detail-modal.component.scss']
})
export class RecipeDetailModalComponent implements OnInit {
  private supabase: SupabaseClient = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  private productService = inject(ProductService);

  recipeId = input.required<string>();
  mealPlanId = input<string | null>(null);
  interactiveSteps = input<boolean>(false);

  closeModal = output<void>();

  recipe: any = null;
  mealPlan: any = null;
  ingredients: any[] = [];
  loading = signal<boolean>(true);

  availableProductsMap = new Map<string, Product[]>(); // ingredientId -> lista produktów
  productDetailsMap = new Map<string, Product>();      // productId -> obiekt produktu
  selectedProductsMap = new Map<string, string>();     // ingredientId -> wybrany productId

  calculatedCalories = signal<number>(0);
  calculatedProtein = signal<number>(0);
  calculatedCarbs = signal<number>(0);
  calculatedFat = signal<number>(0);
  currentServings = signal<number>(1);

  async ngOnInit(): Promise<void> {
    await this.loadRecipeDetails();
  }

  async loadRecipeDetails(): Promise<void> {
    this.loading.set(true);

    const { data: recipeData, error: recipeError } = await this.supabase
    .from('new_recipes')
    .select('*')
    .eq('id', this.recipeId())
    .single();

    if (recipeError || !recipeData) {
      console.error('Błąd pobierania przepisu:', recipeError);
      this.loading.set(false);
      return;
    }
    this.recipe = recipeData;
    this.currentServings.set(recipeData.servings || 1);

    if (this.mealPlanId()) {
      const { data: mealData } = await this.supabase
      .from('new_meal_plans')
      .select('*')
      .eq('id', this.mealPlanId())
      .single();

      if (mealData) {
        this.mealPlan = mealData;
        if (mealData.servings) {
          this.currentServings.set(mealData.servings);
        }
      }
    }

    const { data: ingData, error: ingError } = await this.supabase
    .from('new_recipe_ingredients')
    .select(`
        id,
        amount_in_grams,
        amount,
        unit,
        new_ingredients (
          id,
          name,
          calories_per_100g,
          protein_per_100g,
          carbs_per_100g,
          fat_per_100g
        )
      `)
    .eq('recipe_id', this.recipeId());

    if (!ingError && ingData) {
      this.ingredients = ingData;

      for (const item of ingData) {
        const genIng = (item as any).new_ingredients;
        if (genIng && genIng.id) {
          const products = await this.productService.getProductsForIngredient(genIng.id);
          this.availableProductsMap.set(genIng.id, products);
          products.forEach(p => this.productDetailsMap.set(p.id, p));
        }
      }

      // Następnie pobieramy nadpisania produktów z bazy
      if (this.mealPlanId()) {
        const overrides = await this.productService.getOverridesForMealPlan(this.mealPlanId()!);
        console.log('Pobrane nadpisania z bazy (overrides):', overrides);

        overrides.forEach((o: any) => {
          const ingId = o.ingredientId || o.ingredient_id;
          const prodId = o.productId || o.product_id;
          console.log('Mapowanie override -> ingId:', ingId, 'prodId:', prodId);
          if (ingId && prodId) {
            this.selectedProductsMap.set(ingId, prodId);
          }
        });
        console.log('Finalna mapa selectedProductsMap:', this.selectedProductsMap);
      }

      this.recalculateMacros();
    }

    this.loading.set(false);
  }

  getProductsFor(ingredientId: string): Product[] {
    return this.availableProductsMap.get(ingredientId) || [];
  }

  getSelectedProduct(ingredientId: string): string {
    return this.selectedProductsMap.get(ingredientId) || '';
  }

  getIngredientMacros(item: any): { calories: number; protein: number; carbs: number; fat: number } {
    const genIng = item.new_ingredients;
    if (!genIng) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const selectedProdId = this.selectedProductsMap.get(genIng.id);
    const grams = item.amount_in_grams || 100;

    let cal = (genIng.calories_per_100g || 0) * grams / 100;
    let pro = (genIng.protein_per_100g || 0) * grams / 100;
    let carb = (genIng.carbs_per_100g || 0) * grams / 100;
    let fat = (genIng.fat_per_100g || 0) * grams / 100;

    if (selectedProdId) {
      const prod = this.productDetailsMap.get(selectedProdId);
      if (prod) {
        cal = (prod.caloriesPer100g || 0) * grams / 100;
        pro = (prod.proteinPer100g || 0) * grams / 100;
        carb = (prod.carbsPer100g || 0) * grams / 100;
        fat = (prod.fatPer100g || 0) * grams / 100;
      }
    }

    const multiplier = this.currentServings();
    return {
      calories: Math.round(cal * multiplier),
      protein: Number((pro * multiplier).toFixed(1)),
      carbs: Number((carb * multiplier).toFixed(1)),
      fat: Number((fat * multiplier).toFixed(1))
    };
  }

  recalculateMacros() {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const item of this.ingredients) {
      const macros = this.getIngredientMacros(item);
      totalCalories += macros.calories;
      totalProtein += macros.protein;
      totalCarbs += macros.carbs;
      totalFat += macros.fat;
    }

    this.calculatedCalories.set(Math.round(totalCalories > 0 ? totalCalories : (this.recipe.calories || 0) * this.currentServings()));
    this.calculatedProtein.set(Number((totalProtein > 0 ? totalProtein : (this.recipe.protein || 0) * this.currentServings()).toFixed(1)));
    this.calculatedCarbs.set(Number((totalCarbs > 0 ? totalCarbs : (this.recipe.carbs || 0) * this.currentServings()).toFixed(1)));
    this.calculatedFat.set(Number((totalFat > 0 ? totalFat : (this.recipe.fat || 0) * this.currentServings()).toFixed(1)));
  }

  async onProductChangeModel(ingredientId: string, productId: string): Promise<void> {
    const currentMealPlanId = this.mealPlanId();

    if (!currentMealPlanId) {
      console.warn('Brak mealPlanId – wybór produktu działa tylko w zaplanowanym posiłku.');
      return;
    }

    if (!productId) {
      await this.productService.removeProductOverride(currentMealPlanId, ingredientId);
      this.selectedProductsMap.delete(ingredientId);
    } else {
      const success = await this.productService.saveProductOverride(currentMealPlanId, ingredientId, productId);
      if (success) {
        this.selectedProductsMap.set(ingredientId, productId);
      }
    }

    this.recalculateMacros();

    await this.supabase
    .from('new_meal_plans')
    .update({
      calories: this.calculatedCalories(),
      protein: this.calculatedProtein(),
      carbs: this.calculatedCarbs(),
      fat: this.calculatedFat()
    })
    .eq('id', currentMealPlanId);
  }

  async updateServings(newServings: number) {
    if (newServings < 1) return;
    this.currentServings.set(newServings);
    this.recalculateMacros();

    const currentMealPlanId = this.mealPlanId();
    if (currentMealPlanId) {
      await this.supabase
      .from('new_meal_plans')
      .update({
        servings: newServings,
        calories: this.calculatedCalories(),
        protein: this.calculatedProtein(),
        carbs: this.calculatedCarbs(),
        fat: this.calculatedFat()
      })
      .eq('id', currentMealPlanId);
    }
  }

  getParsedSteps(): string[] {
    if (!this.recipe?.instructions) return [];
    return this.recipe.instructions
    .split('\n')
    .map((step: string) => step.trim())
    .filter((step: string) => step.length > 0);
  }
}
