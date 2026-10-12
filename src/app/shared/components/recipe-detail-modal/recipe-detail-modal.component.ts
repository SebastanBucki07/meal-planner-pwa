import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {environment} from '../../../../environment';
import {ProductService} from '../../../core/services/product.service';
import {Product} from '../../../core/models/product.model';


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

  // Wejścia: ID przepisu oraz opcjonalnie ID wpisu w planie (mealPlanId), jeśli edytujemy konkretny posiłek w kalendarzu
  recipeId = input.required<string>();
  mealPlanId = input<string | null>(null);
  interactiveSteps = input<boolean>(false);

  closeModal = output<void>();

  // Stan przepisu i składników
  recipe: any = null;
  ingredients: any[] = [];
  loading = signal<boolean>(true);

  // Mapy do obsługi konkretnych produktów i nadpisań
  availableProductsMap = new Map<string, Product[]>(); // klucz: ingredientId -> lista produktów
  selectedProductsMap = new Map<string, string>();    // klucz: ingredientId -> wybrany productId

  async ngOnInit(): Promise<void> {
    await this.loadRecipeDetails();
  }

  async loadRecipeDetails(): Promise<void> {
    this.loading.set(true);

    // 1. Pobranie danych przepisu
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

    // 2. Pobranie składników przepisu wraz z powiązanymi generycznymi składnikami
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

      // 3. Jeśli podano mealPlanId, pobieramy zapisane nadpisania produktów dla tego konkretnego posiłku
      if (this.mealPlanId()) {
        const overrides = await this.productService.getOverridesForMealPlan(this.mealPlanId()!);
        overrides.forEach(o => {
          this.selectedProductsMap.set(o.ingredientId, o.productId);
        });
      }

      // 4. Dla każdego składnika pobieramy z bazy listę dostępnych konkretnych produktów markowych
      for (const item of ingData) {
        const genIng = (item as any).new_ingredients;
        if (genIng && genIng.id) {
          const products = await this.productService.getProductsForIngredient(genIng.id);
          this.availableProductsMap.set(genIng.id, products);
        }
      }
    }

    this.loading.set(false);
  }

  getProductsFor(ingredientId: string): Product[] {
    return this.availableProductsMap.get(ingredientId) || [];
  }

  getParsedSteps(): string[] {
    if (!this.recipe?.instructions) return [];
    return this.recipe.instructions
    .split('\n')
    .map((step: string) => step.trim())
    .filter((step: string) => step.length > 0);
  }

  getSelectedProduct(ingredientId: string): string {
    return this.selectedProductsMap.get(ingredientId) || '';
  }

  async onProductChange(ingredientId: string, event: Event): Promise<void> {
    const selectElement = event.target as HTMLSelectElement;
    const productId = selectElement.value;
    const currentMealPlanId = this.mealPlanId();

    if (!currentMealPlanId) {
      console.warn('Brak mealPlanId – wybór produktu działa tylko w kontekście zaplanowanego posiłku w kalendarzu.');
      return;
    }

    if (!productId) {
      // Usunięcie nadpisania (powrót do domyślnego generycznego składnika)
      await this.productService.removeProductOverride(currentMealPlanId, ingredientId);
      this.selectedProductsMap.delete(ingredientId);
    } else {
      // Zapis nowego nadpisania
      const success = await this.productService.saveProductOverride(currentMealPlanId, ingredientId, productId);
      if (success) {
        this.selectedProductsMap.set(ingredientId, productId);
      }
    }
  }
}
